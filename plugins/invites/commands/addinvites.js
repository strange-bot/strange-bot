const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { getEffectiveInvites, checkInviteRewards } = require("../utils");
const { getMember } = require("../schemas/Invites");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "addinvites",
    description: "invites:ADD.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<@member|id> <invites>",
        minArgsCount: 2,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "invites:ADD.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "invites",
                description: "invites:ADD.INVITES_DESC",
                type: ApplicationCommandOptionType.Integer,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        const amount = parseInt(args[1]);

        if (!target) return message.replyT("invites:ADD.INVALID_USER");

        const response = await addInvites(message, target.user, parseInt(amount));
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("invites");
        const response = await addInvites(interaction, user, amount);
        await interaction.followUp(response);
    },
};

async function addInvites({ guild }, user, amount) {
    if (!amount || isNaN(amount)) return guild.getT("invites:ADD.INVALID_AMOUNT");
    if (user.bot) return guild.getT("invites:ADD.BOT");

    const memberDb = await getMember(guild.id, user.id);
    memberDb.added += amount;
    await memberDb.save();

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("invites:ADD.EMBED_TITLE", { user: user.username }),
        })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
            guild.getT("invites:ADD.EMBED_DESC", {
                user: user.username,
                amount: getEffectiveInvites(memberDb),
            }),
        );

    checkInviteRewards(guild, memberDb, true);
    return { embeds: [embed] };
}
