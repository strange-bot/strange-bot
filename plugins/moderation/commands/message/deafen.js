const deafen = require("../shared/deafen");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "deafen",
    description: "moderation:VOICE.SUB_DEAFEN_DESC",
    userPermissions: ["DeafenMembers"],
    botPermissions: ["DeafenMembers"],
    command: {
        enabled: true,
        usage: "<ID|@member> [reason]",
        minArgsCount: 1,
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await deafen(message, target, reason);
        await message.safeReply(response);
    },
};
