const { softbanTarget } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "softban",
    description: "moderation:SOFTBAN.DESCRIPTION",
    botPermissions: ["BanMembers"],
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
                description: "moderation:SOFTBAN.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:SOFTBAN.REASON_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await softban(message.member, target, reason);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const target = await interaction.guild.members.fetch(user.id);

        const response = await softban(interaction.member, target, reason);
        await interaction.followUp(response);
    },
};

async function softban(issuer, target, reason) {
    const guild = issuer.guild;

    const response = await softbanTarget(issuer, target, reason);
    if (typeof response === "boolean")
        return guild.getT("moderation:SOFTBAN.SUCCESS", { target: target.username });
    if (response === "BOT_PERM")
        return guild.getT("moderation:SOFTBAN.BOT_PERM", { target: target.username });
    else if (response === "MEMBER_PERM")
        return guild.getT("moderation:SOFTBAN.MEMBER_PERM", { target: target.username });
    else return guild.getT("moderation:SOFTBAN.FAILED", { target: target.username });
}
