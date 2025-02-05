const { Logger } = require("strange-sdk/utils");

module.exports = (error) => {
    Logger.error("Client Error", error);
};
