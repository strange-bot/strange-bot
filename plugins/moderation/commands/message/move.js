const { ChannelType } = require("discord.js");
const move = require("../shared/move");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "move",
    description: "moderation:VOICE.SUB_MOVE_DESC",
    userPermissions: ["MoveMembers"],
    botPermissions: ["MoveMembers"],
    command: {
        enabled: true,
        usage: "<ID|@member> <channel> [reason]",
        minArgsCount: 1,
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });

        const channels = message.guild.findMatchingChannels(args[1], [
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
        ]);
        if (!channels.length) return message.replyT("common:NO_MATCH_CHANNEL", { query: args[1] });
        const targetChannel = channels.pop();
        if (
            !targetChannel.type === ChannelType.GuildVoice &&
            !targetChannel.type === ChannelType.GuildStageVoice
        ) {
            return message.replyT("moderation:VOICE.INVALID_CHANNEL_TYPE");
        }

        const reason = args.slice(2).join(" ");
        const response = await move(message, target, reason, targetChannel);
        await message.safeReply(response);
    },
};
