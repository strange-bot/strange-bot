const { getEffectiveInvites } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { getMember } = require("../schemas/Invites");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "invites",
    description: "invites:INVITES.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "[@member|id]",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "invites:INVITES.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = (await message.guild.resolveMember(args[0])) || message.member;
        const response = await getInvites(message, target.user);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;
        const response = await getInvites(interaction, user);
        await interaction.followUp(response);
    },
};

async function getInvites({ guild }, user) {
    const settings = guild.getSettings("invites");
    if (!settings.enabled) return guild.getT("invites:INVITES.DISABLED");

    const inviteData = await getMember(guild.id, user.id);

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("invites:INVITES.EMBED_TITLE", {
                user: user.username,
            }),
        })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
            guild.getT("invites:INVITES.EMBED_DESC", {
                user: user.toString(),
                invites: getEffectiveInvites(inviteData),
            }),
        )
        .addFields(
            {
                name: guild.getT("invites:INVITES.INVITES"),
                value: `**${inviteData?.tracked + inviteData?.added || 0}**`,
                inline: true,
            },
            {
                name: guild.getT("invites:INVITES.FAKE"),
                value: `**${inviteData?.fake || 0}**`,
                inline: true,
            },
            {
                name: guild.getT("invites:INVITES.LEFT"),
                value: `**${inviteData?.left || 0}**`,
                inline: true,
            },
        );

    return { embeds: [embed] };
}
