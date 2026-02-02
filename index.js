// Wraps logic to avoid global scope pollution
(function() {
    const extensionName = "Clean Copy Text";
    const extensionId = "clean-copy-text";

    function cleanAndCopy() {
        // Access global ST chat array
        // context.chat is the standard array of message objects
        const context = SillyTavern.getContext(); 
        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Chat is empty", extensionName);
            return;
        }

        // 1. Map messages to get text content
        // 2. Filter out system messages if needed (optional)
        // 3. Regex replace <thinking> tags
        let fullText = context.chat
            .map(msg => {
                // Skip system/hidden messages if desired, otherwise keep all
                if (msg.is_system) return ""; 
                
                let text = msg.mes;
                
                // Regex to remove <thinking>...</thinking> including newlines
                // [\s\S] matches any character including newline
                text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
                
                // Remove extra whitespace left behind
                return text.trim();
            })
            .filter(text => text.length > 0) // Remove empty entries
            .join("\n\n"); // Separator between messages

        // Clipboard API
        navigator.clipboard.writeText(fullText).then(() => {
            toastr.success("Copied clean text to clipboard!", extensionName);
        }).catch(err => {
            console.error("Copy failed", err);
            toastr.error("Failed to copy text. Check console.", extensionName);
        });
    }

    // Register a Slash Command for quick access (/copyclean)
    function registerCommand() {
        if (window.slash_commands) {
            window.slash_commands['copyclean'] = {
                callback: cleanAndCopy,
                description: "Copy chat log without thinking tags",
                returns: "string" // suppress output in chat
            };
        }
    }

    // Add settings button to Extensions Menu
    // This is the UI trigger for mobile users
    $(document).ready(function() {
        const settingsHtml = `
            <div id="${extensionId}-settings" class="extension_settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>${extensionName}</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="styled_button_holder">
                            <div id="clean-copy-btn" class="menu_button">
                                <i class="fa-solid fa-copy"></i> Copy Clean Text
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inject UI
        $("#extensions_settings").append(settingsHtml);

        // Bind click event
        $("#clean-copy-btn").click(function() {
            cleanAndCopy();
        });

        registerCommand();
    });
})();
