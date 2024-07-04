const guildInfo = require("../shared/guild");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "guildinfo",
    description: "information:INFO.SUB_GUILD_DESC",
    botPermissions: ["EmbedLinks"],
    cooldown: 5,
    command: {
        enabled: true,
        aliases: ["serverinfo"],
    },

    async messageRun(message, args) {
        const response = await guildInfo(message.guild);
        await message.safeReply(response);
    },
};
