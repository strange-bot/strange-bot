const emojiInfo = require("../shared/emoji");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "emojiinfo",
    description: "information:INFO.SUB_EMOJI_DESC",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<emoji>",
        minArgsCount: 1,
    },

    async messageRun(message, args) {
        const emoji = args[0];
        const response = emojiInfo(message.guild, emoji);
        await message.safeReply(response);
    },
};
