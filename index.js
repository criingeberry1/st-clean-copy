// @ts-check
(function() {
    const extensionName = "Clean Copy & Save";
    const extensionId = "clean-copy-text-pro";

    const settings = {
        replaceInvisible: localStorage.getItem(`${extensionId}-replace-inv`) === 'true',
        saveToFile: localStorage.getItem(`${extensionId}-save-file`) === 'true'
    };

    function sanitizeFilename(name) {
        // Удаляем пробелы, спецсимволы и ограничиваем длину для стабильности FS
        return name
            .replace(/\s+/g, '_')
            .replace(/[<>:"/\\|?*]/g, '')
            .substring(0, 50);
    }

    function getTimestamp() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    }

    /**
     * Attempts to resolve the most accurate name for the chat
     */
    function resolveChatName(context) {
        // 1. Пытаемся взять имя текущего персонажа
        if (context.character_id !== undefined && context.characters && context.characters[context.character_id]) {
            return context.characters[context.character_id].name;
        }

        // 2. Если это группа, ищем имя группы
        if (context.groupId && context.groups) {
            const currentGroup = context.groups.find(g => g.id === context.groupId);
            if (currentGroup) return currentGroup.name;
        }

        // 3. Фолбэк: берем имя из последнего сообщения в чате (если это не пользователь)
        if (context.chat && context.chat.length > 0) {
            const lastMsg = context.chat[context.chat.length - 1];
            if (lastMsg && !lastMsg.is_user && lastMsg.n) return lastMsg.n;
        }

        return "Chat";
    }

    async function processChat() {
        const context = SillyTavern.getContext();
        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Chat is empty", extensionName);
            return;
        }

        let fullText = context.chat
            .map(msg => {
                if (msg.is_system) return "";
                let text = msg.mes;
                text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
                if (settings.replaceInvisible) {
                    text = text.replace(/\u3164/g, " ");
                }
                return text.trim();
            })
            .filter(text => text.length > 0)
            .join("\n\n");

        if (settings.saveToFile) {
            exportToFile(fullText, context);
        } else {
            copyToClipboard(fullText);
        }
    }

    function exportToFile(text, context) {
        try {
            const rawName = resolveChatName(context);
            const fileName = `${getTimestamp()}-${sanitizeFilename(rawName)}.txt`;

            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            // Чистим за собой
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            toastr.success(`Saved as ${fileName}`, extensionName);
        } catch (err) {
            console.error("Export failed:", err);
            toastr.error("Failed to save file", extensionName);
        }
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            toastr.success("Copied to clipboard!", extensionName);
        } catch (err) {
            toastr.error("Copy failed", extensionName);
        }
    }

    $(document).ready(function() {
        const settingsHtml = `
            <div id="${extensionId}-settings" class="extension_settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>${extensionName}</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container">
                            <label class="checkbox_label">
                                <input type="checkbox" id="${extensionId}-check-inv" ${settings.replaceInvisible ? 'checked' : ''}>
                                Replace "ㅤ" (U+3164) with space
                            </label>
                            <label class="checkbox_label">
                                <input type="checkbox" id="${extensionId}-check-file" ${settings.saveToFile ? 'checked' : ''}>
                                Save to file instead of copy
                            </label>
                        </div>
                        <div class="styled_button_holder" style="margin-top: 10px;">
                            <div id="${extensionId}-run-btn" class="menu_button">
                                <i class="fa-solid fa-file-export"></i> Run Clean Export
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $("#extensions_settings").append(settingsHtml);

        $(`#${extensionId}-run-btn`).click(() => processChat());

        $(`#${extensionId}-check-inv`).change(function() {
            settings.replaceInvisible = $(this).is(':checked');
            localStorage.setItem(`${extensionId}-replace-inv`, settings.replaceInvisible);
        });

        $(`#${extensionId}-check-file`).change(function() {
            settings.saveToFile = $(this).is(':checked');
            localStorage.setItem(`${extensionId}-save-file`, settings.saveToFile);
        });

        if (window.slash_commands) {
            window.slash_commands['copyclean'] = {
                callback: processChat,
                description: "Clean chat and export",
                returns: "string"
            };
        }
    });
})();
