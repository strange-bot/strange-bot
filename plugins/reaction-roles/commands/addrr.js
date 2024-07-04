const { addReactionRole, getReactionRoles } = require("../schemas/ReactionRoles");
const { parseEmoji, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const { MiscUtils } = require("strange-sdk/utils");

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
    name: "addrr",
    description: "reaction-roles:ADD_DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<#channel> <messageId> <emote> <role>",
        minArgsCount: 4,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "channel",
                description: "reaction-roles:ADD_CHANNEL",
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildText],
                required: true,
            },
            {
                name: "message_id",
                description: "reaction-roles:ADD_MESSAGE",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "emoji",
                description: "reaction-roles:ADD_EMOJI",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "role",
                description: "reaction-roles:ADD_ROLE",
                type: ApplicationCommandOptionType.Role,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const targetChannel = message.guild.findMatchingChannels(args[0]);
        if (targetChannel.length === 0)
            return message.replyT("common:NO_MATCH_CHANNEL", { query: args[0] });

        const targetMessage = args[1];

        const role = message.guild.findMatchingRoles(args[3])[0];
        if (!role) return message.replyT("common:NO_MATCH_USER", { query: args[3] });

        const reaction = args[2];

        const response = await addRR(
            message.guild,
            targetChannel[0],
            targetMessage,
            reaction,
            role,
        );
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const targetChannel = interaction.options.getChannel("channel");
        const messageId = interaction.options.getString("message_id");
        const reaction = interaction.options.getString("emoji");
        const role = interaction.options.getRole("role");

        const response = await addRR(interaction.guild, targetChannel, messageId, reaction, role);
        await interaction.followUp(response);
    },
};

async function addRR(guild, channel, messageId, reaction, role) {
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

    if (role.managed) {
        return guild.getT("reaction-roles:MANAGED_ROLE");
    }

    if (guild.roles.everyone.id === role.id) {
        return guild.getT("reaction-roles:EVERYONE_ROLE");
    }

    if (guild.members.me.roles.highest.position < role.position) {
        return guild.getT("reaction-roles:BOT_ROLE_HIGHER");
    }

    const custom = parseEmoji(reaction);
    if (custom.id && !guild.emojis.cache.has(custom.id))
        return guild.getT("reaction-roles:INVALID_EMOJI");
    const emoji = custom.id ? custom.id : custom.name;

    try {
        await targetMessage.react(emoji);
    } catch (ex) {
        return guild.getT("reaction-roles:FAILED_EMOJI", { reaction });
    }

    let overwrite = false;
    const previousRoles = getReactionRoles(guild.id, channel.id, targetMessage.id);
    if (previousRoles.length > 0) {
        const found = previousRoles.find((rr) => rr.emote === emoji);
        if (found) {
            overwrite = true;
        }
    }

    await addReactionRole(guild.id, channel.id, targetMessage.id, emoji, role.id);

    return overwrite
        ? guild.getT("reaction-roles:OVERWRITE_SUCCESS")
        : guild.getT("reaction-roles:ADD_SUCCESS");
}
