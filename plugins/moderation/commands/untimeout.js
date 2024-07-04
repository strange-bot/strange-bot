const { unTimeoutTarget } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "untimeout",
    description: "moderation:UNTIMEOUT.DESCRIPTION",
    botPermissions: ["ModerateMembers"],
    userPermissions: ["ModerateMembers"],
    command: {
        enabled: true,
        aliases: ["unmute"],
        usage: "<ID|@member> [reason]",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "moderation:UNTIMEOUT.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:UNTIMEOUT.REASON_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = args.slice(1).join(" ").trim();
        const response = await untimeout(message.member, target, reason);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const target = await interaction.guild.members.fetch(user.id);

        const response = await untimeout(interaction.member, target, reason);
        await interaction.followUp(response);
    },
};

async function untimeout(issuer, target, reason) {
    const guild = issuer.guild;

    const response = await unTimeoutTarget(issuer, target, reason);
    if (typeof response === "boolean")
        return guild.getT("moderation:UNTIMEOUT.SUCCESS", { target: target.user.username });
    if (response === "BOT_PERM")
        return guild.getT("moderation:COMMON.BOT_PERM", { target: target.user.username });
    else if (response === "MEMBER_PERM")
        return guild.getT("moderation:COMMON.MEMBER_PERM", { target: target.user.username });
    else if (response === "NO_TIMEOUT")
        return guild.getT("moderation:UNTIMEOUT.NO_TIMEOUT", { target: target.user.username });
    else return guild.getT("moderation:UNTIMEOUT.NO_TIMEOUT", { target: target.user.username });
}
