const { Plugin } = require("strange-sdk");
const config = require("./config");

const plugin = new Plugin({
    icon: "fa-solid fa-star",
    dependencies: [],
    baseDir: __dirname,

    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        prefix: {
            type: String,
            default: config.get("PREFIX_COMMANDS").DEFAULT_PREFIX,
        },
        locale: {
            type: String,
            default: config.get("LOCALE").DEFAULT,
        },
        disabled_prefix: [String],
        disabled_slash: [String],
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/settings.router"),
        adminRouter: require("./dashboard/admin.router"),
    },
});

module.exports = plugin;
