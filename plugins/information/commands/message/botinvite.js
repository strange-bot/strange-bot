const botinvite = require("../shared/botinvite");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "botinvite",
    description: "information:BOT.SUB_INVITE_DESC",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
    },

    async messageRun(message, args) {
        const response = botinvite(message);
        try {
            await message.author.send(response);
            return message.replyT("information:BOT.INVITE_DM_SENT");
        } catch (ex) {
            return message.replyT("information:BOT.INVITE_DM_FAILED");
        }
    },
};
