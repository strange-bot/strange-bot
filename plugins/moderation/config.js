const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    EMBED_COLORS: {
        TIMEOUT: "#102027",
        UNTIMEOUT: "#4B636E",
        KICK: "#FF7961",
        SOFTBAN: "#AF4448",
        BAN: "#D32F2F",
        UNBAN: "#00C853",
        VMUTE: "#102027",
        VUNMUTE: "#4B636E",
        DEAFEN: "#102027",
        UNDEAFEN: "#4B636E",
        DISCONNECT: "RANDOM",
        MOVE: "RANDOM",
    },
});
