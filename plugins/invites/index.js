const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    dependencies: [],
    baseDir: __dirname,
    events: ["ready", "guildMemberAdd", "guildMemberRemove", "inviteCreate", "inviteDelete"],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        ranks: [
            {
                invites: { type: Number, required: true },
                _id: { type: String, required: true },
            },
        ],
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
