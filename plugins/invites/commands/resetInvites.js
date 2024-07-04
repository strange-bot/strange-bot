const { getMember } = require("../schemas/Invites");
const { ApplicationCommandOptionType } = require("discord.js");
const { checkInviteRewards } = require("../utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "resetinvites",
    description: "invites:RESET.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<@member>",
        aliases: ["clearinvites"],
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "invites:RESET.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("invites:RESET.INVALID_USER");
        const response = await clearInvites(message, target.user);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const response = await clearInvites(interaction, user);
        await interaction.followUp(response);
    },
};

async function clearInvites({ guild }, user) {
    const memberDb = await getMember(guild.id, user.id);
    memberDb.added = 0;
    await memberDb.save();
    checkInviteRewards(guild, memberDb, false);
    return guild.getT("invites:RESET.SUCCESS", { user: user.username });
}
