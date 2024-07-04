const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "invitecodes",
    description: "invites:CODES.DESCRIPTION",
    botPermissions: ["EmbedLinks", "ManageGuild"],
    command: {
        enabled: true,
        usage: "[@member|id]",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "invites:CODES.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = (await message.guild.resolveMember(args[0])) || message.member;
        const response = await getInviteCodes(message, target.user);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;
        const response = await getInviteCodes(interaction, user);
        await interaction.followUp(response);
    },
};

async function getInviteCodes({ guild }, user) {
    const invites = await guild.invites.fetch({ cache: false });
    const reqInvites = invites.filter((inv) => inv.inviter.id === user.id);
    if (reqInvites.size === 0)
        return guild.getT("invites:CODES.NOT_FOUND", { user: user.username });

    let str = "";
    reqInvites.forEach((inv) => {
        str += `❯ [${inv.code}](${inv.url}) : ${inv.uses} uses\n`;
    });

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("invites:CODES.EMBED_TITLE", { user: user.name }),
        })
        .setDescription(str);

    return { embeds: [embed] };
}
