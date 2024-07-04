const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-sort-numeric-up",
    dependencies: [],
    baseDir: __dirname,
    events: ["guildMemberAdd", "guildMemberRemove", "ready"],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        bots: { type: Number, default: 0 },
        counters: [
            {
                _id: false,
                counter_type: String,
                name: String,
                channel_id: String,
            },
        ],
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
