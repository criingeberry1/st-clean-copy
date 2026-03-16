// Wraps logic to avoid global scope pollution
(function() {
    const extensionName = "Clean Copy Text";
    const extensionId = "clean-copy-text";

    // State management using localStorage for persistence
    const state = {
        replaceInvisible: localStorage.getItem(`${extensionId}-replaceInvisible`) === "true",
        saveToFile: localStorage.getItem(`${extensionId}-saveToFile`) === "true"
    };

    function updateState(key, value) {
        state[key] = value;
        localStorage.setItem(`${extensionId}-${key}`, value);
    }

    function generateTimestamp() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        return `${date}_${time}`;
    }

    function cleanAndProcess() {
        // Access global ST chat array and context
        const context = SillyTavern.getContext();
        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Chat is empty", extensionName);
            return;
        }

        // 1. Map messages to get text content
        // 2. Filter out system messages
        // 3. Regex replace <thinking> tags
        let fullText = context.chat
            .map(msg => {
                if (msg.is_system) return "";

                let text = msg.mes;

                // Regex to remove <thinking>...</thinking> including newlines
                text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

                // Remove invisible character U+3164 if setting is enabled
                if (state.replaceInvisible) {
                    text = text.replace(/\u3164/g, " ");
                }

                return text.trim();
            })
            .filter(text => text.length > 0)
            .join("\n\n");

        if (state.saveToFile) {
            // File Save Logic
            const charNameRaw = context.name2 || "Unknown_Character";
            const charNameClean = charNameRaw.trim().replace(/\s+/g, "_");
            const timestamp = generateTimestamp();
            const fileName = `${timestamp}-${charNameClean}.txt`;

            try {
                const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = fileName;

                document.body.appendChild(link); // Required for Firefox
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(link.href); // Free memory
                toastr.success(`File saved: ${fileName}`, extensionName);
            } catch (err) {
                console.error("[Clean Copy Text] Blob generation failed:", err);
                toastr.error("Failed to save file. Check console.", extensionName);
            }
        } else {
            // Clipboard API Logic
            navigator.clipboard.writeText(fullText).then(() => {
                toastr.success("Copied clean text to clipboard!", extensionName);
            }).catch(err => {
                console.error("[Clean Copy Text] Copy failed:", err);
                toastr.error("Failed to copy text. Check console.", extensionName);
            });
        }
    }

    // Register a Slash Command for quick access
    function registerCommand() {
        if (window.slash_commands) {
            window.slash_commands['copyclean'] = {
                callback: cleanAndProcess,
                description: "Copy or save chat log without thinking tags",
                returns: "string" // suppress output in chat
            };
        }
    }

    // Add settings UI to Extensions Menu
    $(document).ready(function() {
        const settingsHtml = `
            <div id="${extensionId}-settings" class="extension_settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>${extensionName}</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">

                        <div class="flex-container flexFlowColumn gap-2" style="margin-bottom: 10px;">
                            <label class="checkbox_label">
                                <input type="checkbox" id="cc-replace-inv" ${state.replaceInvisible ? "checked" : ""}>
                                <span>Replace 'ㅤ' (invisible char) with spaces</span>
                            </label>

                            <label class="checkbox_label">
                                <input type="checkbox" id="cc-save-file" ${state.saveToFile ? "checked" : ""}>
                                <span>Save to file instead of copy</span>
                            </label>
                        </div>

                        <div class="styled_button_holder">
                            <div id="clean-copy-btn" class="menu_button">
                                <i class="fa-solid fa-file-export"></i> Execute Clean &amp; Export
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inject UI
        $("#extensions_settings").append(settingsHtml);

        // Bind DOM events
        $("#cc-replace-inv").on("change", function() {
            updateState("replaceInvisible", $(this).is(":checked"));
        });

        $("#cc-save-file").on("change", function() {
            updateState("saveToFile", $(this).is(":checked"));
        });

        $("#clean-copy-btn").on("click", function() {
            cleanAndProcess();
        });

        registerCommand();
    });
})();
