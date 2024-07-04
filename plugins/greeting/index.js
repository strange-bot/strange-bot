const { Plugin } = require("strange-sdk");

module.exports = new Plugin({
    icon: "fa-solid fa-user-plus",
    dependencies: ["invites"],
    baseDir: __dirname,
    events: ["guildMemberAdd", "guildMemberRemove"],
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        autorole_id: String,
        welcome: {
            enabled: Boolean,
            channel: String,
            content: String,
            embed: {
                description: String,
                color: String,
                thumbnail: Boolean,
                footer: String,
                image: String,
            },
        },
        farewell: {
            enabled: Boolean,
            channel: String,
            content: String,
            embed: {
                description: String,
                color: String,
                thumbnail: Boolean,
                footer: String,
                image: String,
            },
        },
    },

    dashboard: {
        enabled: true,
        settingsRouter: require("./dashboard/router"),
    },
});
