const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { getEffectiveInvites } = require("../utils");
const { stripIndent } = require("common-tags");
const { getMember } = require("../schemas/Invites");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "inviter",
    description: "invites:INVITER.DESCRIPTION",
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
                description: "invites:INVITER.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = (await message.guild.resolveMember(args[0])) || message.member;
        const response = await getInviter(message, target.user);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;
        const response = await getInviter(interaction, user);
        await interaction.followUp(response);
    },
};

async function getInviter({ guild }, user) {
    const settings = guild.getSettings("invites");
    if (!settings.enabled) return guild.getT("invites:INVITER.DISABLED");

    const inviteData = await getMember(guild.id, user.id);
    if (!inviteData || !inviteData.inviter) {
        return guild.getT("invites:INVITER.CANNOT_TRACK", { user: user.username });
    }

    const inviter = await guild.client.users.fetch(inviteData.inviter, false, true);
    const inviterData = await getMember(guild.id, inviteData.inviter);

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("invites:INVITER.EMBED_TITLE", { user: user.name }),
        })
        .setDescription(
            stripIndent`
      ${guild.getT("invites:INVITER.INVITER")}: \`${inviter?.username || guild.getT("invites:INVITER.DELETED")}\`
      ${guild.getT("invites:INVITER.INVITER_ID")}: \`${inviteData.inviter}\`
      ${guild.getT("invites:INVITER.INVITE_CODE")}: \`${inviteData.code}\`
      ${guild.getT("invites:INVITER.INVITES")}: \`${getEffectiveInvites(inviterData)}\`
      `,
        );

    return { embeds: [embed] };
}
