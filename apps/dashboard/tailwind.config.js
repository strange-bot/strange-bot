module.exports = {
    content: [
        "./src/*.js",
        "./views/**/*.ejs",
        "../../plugins/**/*.ejs",
        "./node_modules/flowbite/**/*.js",
    ],
    safelist: [
        "w-64",
        "w-1/2",
        "rounded-l-lg",
        "rounded-r-lg",
        "bg-gray-200",
        "grid-cols-4",
        "grid-cols-7",
        "h-6",
        "leading-6",
        "h-9",
        "leading-9",
        "shadow-lg",
        "bg-opacity-50",
        "dark:bg-opacity-80",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: {
                    light: "var(--c-primary-light)", // Light shade of primary
                    DEFAULT: "var(--c-primary)", // Default primary color
                    dark: "var(--c-primary-dark)", // Dark shade of primary (used for hover)
                },
                success: {
                    light: "var(--c-success-light)", // Light shade of success
                    DEFAULT: "var(--c-success)", // Default success color
                    dark: "var(--c-success-dark)", // Dark shade of success (used for hover)
                },
                error: {
                    light: "var(--c-error-light)", // Light shade of error
                    DEFAULT: "var(--c-error)", // Default error color
                    dark: "var(--c-error-dark)", // Dark shade of error (used for hover)
                },

                border: "var(--c-border)", // borders and separators

                bg: {
                    page: "var(--c-bg)", // Page background
                    panel: "var(--c-bg-alt)", // Cards, panels, sidebar
                    interactive: "var(--c-bg-active)", // Active sidebar, inputs, textareas
                    surface: "var(--c-surface)", // Overlays like dropdowns, tooltips
                },

                text: {
                    DEFAULT: "var(--c-text)", // Default text color
                    muted: "var(--c-text-muted)", // Muted or secondary text color
                },
            },
            fontFamily: {
                sans: [
                    "Inter",
                    "ui-sans-serif",
                    "system-ui",
                    "-apple-system",
                    "system-ui",
                    "Segoe UI",
                    "Roboto",
                    "Helvetica Neue",
                    "Arial",
                    "Noto Sans",
                    "sans-serif",
                    "Apple Color Emoji",
                    "Segoe UI Emoji",
                    "Segoe UI Symbol",
                    "Noto Color Emoji",
                ],
                body: [
                    "Inter",
                    "ui-sans-serif",
                    "system-ui",
                    "-apple-system",
                    "system-ui",
                    "Segoe UI",
                    "Roboto",
                    "Helvetica Neue",
                    "Arial",
                    "Noto Sans",
                    "sans-serif",
                    "Apple Color Emoji",
                    "Segoe UI Emoji",
                    "Segoe UI Symbol",
                    "Noto Color Emoji",
                ],
                mono: [
                    "ui-monospace",
                    "SFMono-Regular",
                    "Menlo",
                    "Monaco",
                    "Consolas",
                    "Liberation Mono",
                    "Courier New",
                    "monospace",
                ],
            },
            transitionProperty: {
                width: "width",
            },
            textDecoration: ["active"],
            minWidth: {
                kanban: "28rem",
            },
        },
    },

    plugins: [require("flowbite/plugin")],
};
