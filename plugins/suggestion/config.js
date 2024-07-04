const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    UPVOTE_EMOJI: "⬆️",
    DOWNVOTE_EMOJI: "⬇️",
    DEFAULT_EMBED: "#4F545C",
    APPROVED_EMBED: "#43B581",
    DENIED_EMBED: "#F04747",
});
