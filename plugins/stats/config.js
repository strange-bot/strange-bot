const { Config } = require("strange-sdk");

module.exports = new Config(__dirname, {
    LEVEL_UP_MESSAGE: "{member:tag}, You just advanced to **Level {level}**",
    STRANGE_API_URL: "https://strangeapi.hostz.me/api",
    STRANGE_API_KEY: "YOUR_API_KEY",
});
