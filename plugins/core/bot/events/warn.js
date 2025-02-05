const { Logger } = require("strange-sdk/utils");

module.exports = (message) => {
    Logger.warn(`Client Warning: ${message}`);
};
