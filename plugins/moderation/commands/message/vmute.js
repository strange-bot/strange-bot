const vmute = require("../shared/vmute");

module.exports = {
    name: "vmute",
    description: "moderation:VOICE.SUB_MUTE_DESC",
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
        const response = await vmute(message, target, reason);
        await message.safeReply(response);
    },
};
