const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    WEATHERSTACK_KEY: "YOUR_API_KEY",
});
