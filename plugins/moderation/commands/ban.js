const { banTarget } = require("../utils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "ban",
    description: "moderation:BAN.DESCRIPTION",
    botPermissions: ["BanMembers"],
    userPermissions: ["BanMembers"],
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
                description: "moderation:BAN.USER_DESCr",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "reason",
                description: "moderation:BAN.REASON_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const match = await message.client.resolveUsers(args[0], true);
        const target = match[0];
        if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
        const reason = message.content.split(args[0])[1].trim();
        const response = await ban(message.member, target, reason);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const target = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");

        const response = await ban(interaction.member, target, reason);
        await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').GuildMember} issuer
 * @param {import('discord.js').User} target
 * @param {string} reason
 */
async function ban(issuer, target, reason) {
    const { guild } = issuer;

    const response = await banTarget(issuer, target, reason);
    if (typeof response === "boolean")
        return guild.getT("moderation:BAN.SUCCESS", { target: target.username });
    if (response === "BOT_PERM")
        return guild.getT("moderation:BAN.BOT_PERM", { target: target.username });
    else if (response === "MEMBER_PERM")
        return guild.getT("moderation:BAN.MEMBER_PERM", { target: target.username });
    else return guild.getT("moderation:BAN.FAILED", { target: target.username });
}
