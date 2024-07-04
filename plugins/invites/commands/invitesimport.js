const { getMember } = require("../schemas/Invites");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "invitesimport",
    description: "invites:IMPORT.DESCRIPTION",
    botPermissions: ["ManageGuild"],
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "[@member]",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "invites:IMPORT.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0]);
        const response = await importInvites(message, target?.user);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const response = await importInvites(interaction, user);
        await interaction.followUp(response);
    },
};

async function importInvites({ guild }, user) {
    if (user && user.bot) return guild.getT("invites:IMPORT.BOT");

    const invites = await guild.invites.fetch({ cache: false });

    // temporary store for invites
    const tempMap = new Map();

    for (const invite of invites.values()) {
        const inviter = invite.inviter;
        if (!inviter || invite.uses === 0) continue;
        if (!tempMap.has(inviter.id)) tempMap.set(inviter.id, invite.uses);
        else {
            const uses = tempMap.get(inviter.id) + invite.uses;
            tempMap.set(inviter.id, uses);
        }
    }

    for (const [userId, uses] of tempMap.entries()) {
        const memberDb = await getMember(guild.id, userId);
        memberDb.added += uses;
        await memberDb.save();
    }

    return user
        ? guild.getT("invites:IMPORT.SUCCESS", { user: user.username })
        : guild.getT("invites:IMPORT.SUCCESS_ALL");
}
