const { Config } = require("strange-sdk");
require("dotenv").config({path: require("path").join(__dirname, ".env")});

module.exports = new Config(__dirname, {
    EMBED_COLOR: "#36393F",
    STRANGE_API_URL: "https://strangeapi.hostz.me/api",
    STRANGE_API_KEY: process.env.STRANGE_API_KEY,
});
