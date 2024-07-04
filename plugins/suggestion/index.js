const { Plugin } = require("strange-sdk");
const config = require("./config");

module.exports = new Plugin({
    icon: "fa-solid fa-lightbulb",
    dependencies: [],
    baseDir: __dirname,
    events: ["interactionCreate"],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        upvote_emoji: {
            type: String,
            default: config.get("UPVOTE_EMOJI"),
        },
        downvote_emoji: {
            type: String,
            default: config.get("DOWNVOTE_EMOJI"),
        },
        default_embed: {
            type: String,
            default: config.get("DEFAULT_EMBED"),
        },
        approved_embed: {
            type: String,
            default: config.get("APPROVED_EMBED"),
        },
        rejected_embed: {
            type: String,
            default: config.get("DENIED_EMBED"),
        },
        channel_id: String,
        approved_channel: String,
        rejected_channel: String,
        staff_roles: [String],
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/settings.router"),
        adminRouter: require("./dashboard/admin.router"),
    },
});
