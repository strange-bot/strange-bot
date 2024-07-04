const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    LOCALE: {
        DEFAULT: "en-US",
    },
    DASHBOARD: {
        ENABLED: true,
        ENCRYPT: true,
        LOGO_NAME: "Strange",
        LOGO_URL: "https://discordemoji.com/assets/emoji/discord.png",
    },
    PREFIX_COMMANDS: {
        ENABLED: true,
        DEFAULT_PREFIX: "!",
    },
    INTERACTIONS: {
        SLASH: true,
        CONTEXT: true,
    },

    SUPPORT_SERVER: "https://discord.gg/abc123",
});
