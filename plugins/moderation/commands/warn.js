const { warnTarget } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "warn",
    description: "moderation:WARN.DESCRIPTION",
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
                description: "moderation:WARN.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:WARN.REASON_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await warn(message.member, target, reason);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const target = await interaction.guild.members.fetch(user.id);

        const response = await warn(interaction.member, target, reason);
        await interaction.followUp(response);
    },
};

async function warn(issuer, target, reason) {
    const guild = issuer.guild;

    const response = await warnTarget(issuer, target, reason);
    if (typeof response === "boolean")
        return guild.getT("moderation:WARN.SUCCESS", { target: target.user.username });
    if (response === "BOT_PERM")
        return guild.getT("moderation:WARN.BOT_PERM", { target: target.user.username });
    else if (response === "MEMBER_PERM")
        return guild.getT("moderation:WARN.MEMBER_PERM", { target: target.user.username });
    else return guild.getT("moderation:WARN.FAILED", { target: target.user.username });
}
