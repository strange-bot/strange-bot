const { removeReactionRole } = require("../schemas/ReactionRoles");
const { MiscUtils } = require("strange-sdk/utils");
const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

const channelPerms = [
    "EmbedLinks",
    "ReadMessageHistory",
    "AddReactions",
    "UseExternalEmojis",
    "ManageMessages",
];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "removerr",
    description: "reaction-roles:REMOVE_DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<#channel> <messageId>",
        minArgsCount: 2,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "channel",
                description: "reaction-roles:REMOVE_CHANNEL",
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildText],
                required: true,
            },
            {
                name: "message_id",
                description: "reaction-roles:REMOVE_MESSAGE",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const targetChannel = message.guild.findMatchingChannels(args[0]);
        if (targetChannel.length === 0)
            return message.replyT("common:NO_MATCH_CHANNEL", { query: args[0] });

        const targetMessage = args[1];
        const response = await removeRR(message.guild, targetChannel[0], targetMessage);

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const targetChannel = interaction.options.getChannel("channel");
        const messageId = interaction.options.getString("message_id");

        const response = await removeRR(interaction.guild, targetChannel, messageId);
        await interaction.followUp(response);
    },
};

async function removeRR(guild, channel, messageId) {
    if (!channel.permissionsFor(guild.members.me).has(channelPerms)) {
        return guild.getT("reaction-roles:MISSING_PERMS", {
            channel: channel.toString(),
            permissions: MiscUtils.parsePermissions(channelPerms),
        });
    }

    let targetMessage;
    try {
        targetMessage = await channel.messages.fetch({ message: messageId });
    } catch (ex) {
        return guild.getT("reaction-roles:INVALID_MESSAGE");
    }

    try {
        await removeReactionRole(guild.id, channel.id, targetMessage.id);
        await targetMessage.reactions?.removeAll();
    } catch (ex) {
        return guild.getT("reaction-roles:REMOVE_ERROR");
    }

    return guild.getT("reaction-roles:REMOVE_SUCCESS");
}
