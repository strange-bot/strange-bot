const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    POLL_INTERVAL: 2 * 60 * 1000,
    NOTIFICATION_THRESHOLD: 10 * 60 * 1000,
});
