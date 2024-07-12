const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-language",
    dependencies: [],
    baseDir: __dirname,
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        flag_translation: Boolean,
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
