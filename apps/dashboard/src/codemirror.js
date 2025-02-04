/* global CodeMirror */

// Check if CodeMirror is available
if (typeof CodeMirror !== "undefined") {
    var theme = "default"; // default to light theme

    // If dark mode is enabled, use a dark theme
    if (
        localStorage.getItem("color-theme") === "dark" ||
        (!("color-theme" in localStorage) &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
        theme = "material-darker";
    }

    // Initialize CodeMirror editors
    var htmlEditor = CodeMirror.fromTextArea(document.getElementById("html-editor"), {
        mode: "htmlmixed",
        lineNumbers: true,
        autoCloseTags: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        autofocus: true,
        theme: theme,
        matchTags: { bothTags: true },
        extraKeys: { "Ctrl-Space": "autocomplete" },
    });

    var cssEditor = CodeMirror.fromTextArea(document.getElementById("css-editor"), {
        mode: "css",
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        theme: theme,
        extraKeys: { "Ctrl-Space": "autocomplete" },
    });

    var jsEditor = CodeMirror.fromTextArea(document.getElementById("js-editor"), {
        mode: "javascript",
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        theme: theme,
        extraKeys: { "Ctrl-Space": "autocomplete" },
    });

    // Update theme on dark mode toggle
    document.addEventListener("dark-mode", function () {
        if (document.documentElement.classList.contains("dark")) {
            htmlEditor.setOption("theme", "material-darker");
            cssEditor.setOption("theme", "material-darker");
            jsEditor.setOption("theme", "material-darker");
        } else {
            htmlEditor.setOption("theme", "default");
            cssEditor.setOption("theme", "default");
            jsEditor.setOption("theme", "default");
        }
    });
}
