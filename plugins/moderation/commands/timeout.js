const { timeoutTarget } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");
const ems = require("enhanced-ms");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "timeout",
    description: "moderation:TIMEOUT.DESCRIPTION",
    botPermissions: ["ModerateMembers"],
    userPermissions: ["ModerateMembers"],
    command: {
        enabled: true,
        aliases: ["mute"],
        usage: "<ID|@member> <duration> [reason]",
        minArgsCount: 2,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "moderation:TIMEOUT.USER_DESC",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "duration",
                description: "moderation:TIMEOUT.DURATION_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:TIMEOUT.REASON_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const target = await message.guild.resolveMember(args[0], true);
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });

        // parse time
        const ms = ems(args[1]);
        if (!ms) return message.replyT("moderation:TIMEOUT.INVALID_TIME");

        const reason = args.slice(2).join(" ").trim();
        const response = await timeout(message.member, target, ms, reason);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const user = interaction.options.getUser("user");

        // parse time
        const duration = interaction.options.getString("duration");
        const ms = ems(duration);
        if (!ms) return interaction.followUpT("moderation:TIMEOUT.INVALID_TIME");

        const reason = interaction.options.getString("reason");
        const target = await interaction.guild.members.fetch(user.id);

        const response = await timeout(interaction.member, target, ms, reason);
        await interaction.followUp(response);
    },
};

async function timeout(issuer, target, ms, reason) {
    const guild = issuer.guild;

    if (isNaN(ms)) return guild.getT("moderation:TIMEOUT.INVALID_TIME");
    const response = await timeoutTarget(issuer, target, ms, reason);
    if (typeof response === "boolean")
        return guild.getT("moderation:TIMEOUT.SUCCESS", { target: target.user.username });
    if (response === "BOT_PERM")
        return guild.getT("moderation:TIMEOUT.BOT_PERM", { target: target.user.username });
    else if (response === "MEMBER_PERM")
        return guild.getT("moderation:TIMEOUT.MEMBER_PERM", { target: target.user.username });
    else if (response === "ALREADY_TIMEOUT")
        return guild.getT("moderation:TIMEOUT.ALREADY_TIMEOUT", { target: target.user.username });
    else return guild.getT("moderation:TIMEOUT.FAILED", { target: target.user.username });
}
