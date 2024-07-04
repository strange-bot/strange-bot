const disconnect = require("../shared/disconnect");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "disconnect",
    description: "moderation:VOICE.SUB_KICK_DESC",
    userPermissions: ["MuteMembers"],
    command: {
        enabled: true,
        usage: "<ID|@member> [reason]",
        minArgsCount: 1,
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await disconnect(message, target, reason);
        await message.safeReply(response);
    },
};
