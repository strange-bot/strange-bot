const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    STATUS: "online", // The bot's status [online, idle, dnd, invisible]
    TYPE: "WATCHING", // Status type for the bot [PLAYING | LISTENING | WATCHING | COMPETING]
    MESSAGE: "with {servers} servers and {members} members!", // Your bot status message
});
