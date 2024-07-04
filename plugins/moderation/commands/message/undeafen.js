const undeafen = require("../shared/undeafen");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "undeafen",
    description: "moderation:VOICE.SUB_UNDEAFEN_DESC",
    userPermissions: ["DeafenMembers"],
    botPermissions: ["DeafenMembers"],
    command: {
        enabled: true,
        usage: "<ID|@member> [reason]",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: false,
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await undeafen(message, target, reason);
        await message.safeReply(response);
    },
};
