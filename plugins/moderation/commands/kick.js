const { kickTarget } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "kick",
    description: "moderation:KICK.DESCRIPTION",
    botPermissions: ["KickMembers"],
    userPermissions: ["KickMembers"],
    command: {
        enabled: true,
        usage: "<ID|@member> [reason]",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "moderation:KICK.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:KICK.REASON_DESCk",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await kick(message.member, target, reason);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const target = await interaction.guild.members.fetch(user.id);

        const response = await kick(interaction.member, target, reason);
        await interaction.followUp(response);
    },
};

async function kick(issuer, target, reason) {
    const guild = issuer.guild;

    const response = await kickTarget(issuer, target, reason);
    if (typeof response === "boolean")
        return guild.getT("moderation:KICK.SUCCESS", { target: target.username });
    if (response === "BOT_PERM")
        return guild.getT("moderation:KICK.BOT_PERM", { target: target.username });
    else if (response === "MEMBER_PERM")
        return guild.getT("moderation:KICK.MEMBER_PERM", { target: target.username });
    else return guild.getT("moderation:KICK.FAILED", { target: target.username });
}
