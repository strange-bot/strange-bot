const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    CURRENCY: "₪",
    DAILY_COINS: 100, // coins to be received by daily command
    MIN_BEG_AMOUNT: 100, // minimum coins to be received when beg command is used
    MAX_BEG_AMOUNT: 2500, // maximum coins to be received when beg command is used
    BEG_INTERVAL: 12, // beg command interval in hours
});
