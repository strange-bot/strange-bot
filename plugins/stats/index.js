const { Plugin } = require("strange-sdk");
const config = require("./config");

module.exports = new Plugin({
    icon: "fa-solid fa-chart-line",
    dependencies: [],
    baseDir: __dirname,
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        xp: {
            message: {
                type: String,
                default: config.get("LEVEL_UP_MESSAGE"),
            },
            channel: String,
            cooldown: { type: Number, default: 5 },
        },
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/settings.router"),
        adminRouter: require("./dashboard/admin.router"),
    },
});
