const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    IDLE_TIME: 60, // Time in seconds before the bot disconnects from an idle voice channel
    MAX_SEARCH_RESULTS: 5,
    DEFAULT_SOURCE: "SC", // YT = Youtube, YTM = Youtube Music, SC = SoundCloud
    // Add any number of lavalink nodes here
    // Refer to https://github.com/freyacodes/Lavalink to host your own lavalink server
    LAVALINK_NODES: [],

    SPOTIFY: {
        CLIENT_ID: "",
        CLIENT_SECRET: "",
    },
});
