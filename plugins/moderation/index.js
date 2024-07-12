const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-user-shield",
    dependencies: [],
    baseDir: __dirname,
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        modlog_channel: String,
        max_warn: {
            action: {
                type: String,
                enum: ["TIMEOUT", "KICK", "BAN"],
                default: "KICK",
            },
            limit: { type: Number, default: 5 },
        },
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
