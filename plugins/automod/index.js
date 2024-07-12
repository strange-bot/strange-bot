const { Plugin } = require("strange-sdk");
const { cleanupCache } = require("./utils");

module.exports = new Plugin({
    icon: "fa-solid fa-robot",
    baseDir: __dirname,
    dependencies: [],
    init: (client) => {
        cleanupCache();
    },
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        debug: Boolean,
        log_channel: String,
        embed_colors: {
            log: String,
            dm: String,
        },
        strikes: { type: Number, default: 10 },
        action: { type: String, default: "TIMEOUT" },
        wh_channels: [String],
        anti_attachments: Boolean,
        anti_invites: Boolean,
        anti_links: Boolean,
        anti_spam: Boolean,
        anti_ghostping: Boolean,
        anti_massmention: Number,
        max_lines: Number,
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
