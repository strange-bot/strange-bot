const js = require("@eslint/js");
const jsdoc = require("eslint-plugin-jsdoc");
const globals = require("globals");

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = [
    {
        ignores: [".vscode", "eslint.config.js", "**/apps/dashboard/public/*"],
    },
    js.configs.recommended,
    {
        name: "Apps, Plugins, Scripts",
        files: [
            "apps/bot/**/*.js",
            "apps/dashboard/*.js",
            "apps/dashboard/!(src)/**/*.js",
            "plugins/**/*.js",
            "scripts/*.js",
        ],
        languageOptions: {
            sourceType: "commonjs",
            ecmaVersion: 2022,
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            jsdoc: jsdoc,
        },
        rules: {
            "no-unused-vars": [
                "error",
                {
                    vars: "all",
                    args: "all",
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                    caughtErrors: "none",
                },
            ],
            "jsdoc/no-undefined-types": 1,
            "jsdoc/require-jsdoc": 0,
            "no-cond-assign": 0,
        },
    },
    {
        name: "Dashboard Browser",
        files: ["apps/dashboard/src/*.js"],
        languageOptions: {
            sourceType: "module",
            ecmaVersion: 2022,
            globals: {
                ...globals.browser,
                $: true,
            },
        },
        plugins: {
            jsdoc: jsdoc,
        },
        rules: {
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                },
            ],
            "jsdoc/no-undefined-types": 1,
            "jsdoc/require-jsdoc": 1,
            "no-cond-assign": 0,
        },
    },
    {
        name: "Packages",
        files: ["packages/**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
            ecmaVersion: 2022,
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            jsdoc: jsdoc,
        },
        rules: {
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                },
            ],
            "jsdoc/check-access": 1,
            "jsdoc/check-alignment": 1,
            "jsdoc/check-param-names": 1,
            "jsdoc/check-property-names": 1,
            "jsdoc/check-tag-names": 1,
            "jsdoc/check-types": 1,
            "jsdoc/check-values": 1,
            "jsdoc/empty-tags": 1,
            "jsdoc/implements-on-classes": 1,
            "jsdoc/multiline-blocks": 1,
            "jsdoc/no-multi-asterisks": 1,
            "jsdoc/no-undefined-types": 1,
            "jsdoc/require-jsdoc": 1,
            "jsdoc/require-param": 1,
            "jsdoc/require-param-description": 1,
            "jsdoc/require-param-name": 1,
            "jsdoc/require-param-type": 1,
            "jsdoc/require-property": 1,
            "jsdoc/require-property-description": 1,
            "jsdoc/require-property-name": 1,
            "jsdoc/require-property-type": 1,
            "jsdoc/require-returns": 1,
            "jsdoc/require-returns-check": 1,
            "jsdoc/require-returns-description": 1,
            "jsdoc/require-returns-type": 1,
            "jsdoc/require-yields": 1,
            "jsdoc/require-yields-check": 1,
            "jsdoc/tag-lines": 1,
            "jsdoc/valid-types": 1,
        },
    },
];
