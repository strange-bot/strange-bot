const { Plugin } = require("strange-sdk");
const config = require("./config");

module.exports = new Plugin({
    icon: "fa-solid fa-gift",
    dependencies: [],
    baseDir: __dirname,
    events: ["ready"],

    init: (client) => {
        client.giveawaysManager = require("./giveaway")(client);
    },

    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        reaction: {
            type: String,
            default: config.get("DEFAULT_EMOJI"),
        },
        start_embed_color: {
            type: String,
            default: config.get("START_EMBED_COLOR"),
        },
        end_embed_color: {
            type: String,
            default: config.get("END_EMBED_COLOR"),
        },
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/settings.router"),
        adminRouter: require("./dashboard/admin.router"),
    },
});
