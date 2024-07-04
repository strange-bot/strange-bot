const { EmbedUtils } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "inviteranks",
    description: "invites:RANKS.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun(message) {
        const settings = message.guild.getSettings("invites");
        const response = await getInviteRanks(message, settings);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const settings = interaction.guild.getSettings("invites");
        const response = await getInviteRanks(interaction, settings);
        await interaction.followUp(response);
    },
};

async function getInviteRanks({ guild }, settings) {
    if (settings.ranks.length === 0) guild.getT("invites:RANKS.NO_RANKS");
    let str = "";

    settings.ranks.forEach((data) => {
        const roleName = guild.roles.cache.get(data._id)?.toString();
        if (roleName) {
            str += `❯ ${roleName}: ${data.invites} invites\n`;
        }
    });

    if (!str) str = guild.getT("invites:RANKS.NO_RANKS");

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("invites:RANKS.EMBED_TITLE"),
        })
        .setDescription(str);
    return { embeds: [embed] };
}
