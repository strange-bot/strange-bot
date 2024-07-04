const { Plugin } = require("strange-sdk");
const { DiscordTogether } = require("discord-together");

module.exports = new Plugin({
    icon: "fa-solid fa-face-grin-tears",
    dependencies: [],
    baseDir: __dirname,
    events: [],
    init: (client) => {
        client.discordTogether = new DiscordTogether(client);
    },
    settings: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
});
