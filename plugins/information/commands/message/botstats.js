const botstats = require("../shared/botstats");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "botstats",
    description: "information:BOT.SUB_STATS_DESC",
    botPermissions: ["EmbedLinks"],
    cooldown: 5,
    command: {
        enabled: true,
        aliases: ["botstat", "botinfo"],
    },

    async messageRun(message, args) {
        const response = botstats(message);
        await message.safeReply(response);
    },
};
