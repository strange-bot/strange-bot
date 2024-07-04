const vunmute = require("../shared/vunmute");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vunmute",
    description: "moderation:VOICE.SUB_UNMUTE_DESC",
    userPermissions: ["MuteMembers"],
    botPermissions: ["MuteMembers"],
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
        const response = await vunmute(message, target, reason);
        await message.safeReply(response);
    },
};
