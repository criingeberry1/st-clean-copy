// @ts-check
(function() {
    const extensionName = "Clean Copy & Save";
    const extensionId = "clean-copy-text-pro";

    // Default settings
    const settings = {
        replaceInvisible: localStorage.getItem(`${extensionId}-replace-inv`) === 'true',
        saveToFile: localStorage.getItem(`${extensionId}-save-file`) === 'true'
    };

    /**
     * Sanitizes filename to prevent OS-level errors
     * @param {string} name
     * @returns {string}
     */
    function sanitizeFilename(name) {
        return name.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '');
    }

    /**
     * Generates formatted timestamp YYYY-MM-DD-HH-mm-ss
     * @returns {string}
     */
    function getTimestamp() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    }

    /**
     * Core logic for cleaning and exporting chat
     */
    async function processChat() {
        const context = SillyTavern.getContext();
        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Chat is empty", extensionName);
            return;
        }

        // Processing chat messages
        let fullText = context.chat
            .map(msg => {
                if (msg.is_system) return "";

                let text = msg.mes;

                // 1. Remove <thinking> tags and content
                text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

                // 2. Replace invisible Hangul Filler (U+3164) if enabled
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

    /**
     * Trigger file download
     */
    function exportToFile(text, context) {
        try {
            const charName = context.characters[context.character_id]?.name || "Unknown_Char";
            const fileName = `${getTimestamp()}-${sanitizeFilename(charName)}.txt`;

            const blob = new Blob([text], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toastr.success(`Saved to ${fileName}`, extensionName);
        } catch (err) {
            console.error("File save failed", err);
            toastr.error("Failed to save file", extensionName);
        }
    }

    /**
     * Copy to system clipboard
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            toastr.success("Copied clean text to clipboard!", extensionName);
        } catch (err) {
            console.error("Copy failed", err);
            toastr.error("Failed to copy. Check console.", extensionName);
        }
    }

    /**
     * UI Injection and Event Binding
     */
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

        // Event: Run
        $(`#${extensionId}-run-btn`).click(() => processChat());

        // Event: Save Settings
        $(`#${extensionId}-check-inv`).change(function() {
            settings.replaceInvisible = $(this).is(':checked');
            localStorage.setItem(`${extensionId}-replace-inv`, settings.replaceInvisible);
        });

        $(`#${extensionId}-check-file`).change(function() {
            settings.saveToFile = $(this).is(':checked');
            localStorage.setItem(`${extensionId}-save-file`, settings.saveToFile);
        });

        // Register Slash Command
        if (window.slash_commands) {
            window.slash_commands['copyclean'] = {
                callback: processChat,
                description: "Clean chat and export (based on settings)",
                returns: "string"
            };
        }
    });
})();
