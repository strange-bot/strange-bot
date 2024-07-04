const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { getWarningLogs, clearWarningLogs } = require("../schemas/ModLog");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "warnings",
    description: "moderation:WARNINGS.DESCRIPTION",
    userPermissions: ["KickMembers"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "list [member]",
                description: "moderation:WARNINGS.SUB_LIST_DESC",
            },
            {
                trigger: "clear <member>",
                description: "moderation:WARNINGS.SUB_CLEAR_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "list",
                description: "moderation:WARNINGS.SUB_LIST_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:WARNINGS.SUB_LIST_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
            {
                name: "clear",
                description: "moderation:WARNINGS.SUB_CLEAR_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:WARNINGS.SUB_CLEAR_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0]?.toLowerCase();
        let response = "";

        if (sub === "list") {
            const target = (await message.guild.resolveMember(args[1], true)) || message.member;
            if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
            response = await listWarnings(target, message);
        }

        //
        else if (sub === "clear") {
            const target = await message.guild.resolveMember(args[1], true);
            if (!target) return message.replyT("common:NO_MATCH_USER", { query: args[0] });
            response = await clearWarnings(target, message);
        }

        // else
        else {
            response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub });
        }

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        let response = "";

        if (sub === "list") {
            const user = interaction.options.getUser("user");
            const target = (await interaction.guild.members.fetch(user.id)) || interaction.member;
            response = await listWarnings(target, interaction);
        }

        //
        else if (sub === "clear") {
            const user = interaction.options.getUser("user");
            const target = await interaction.guild.members.fetch(user.id);
            response = await clearWarnings(target, interaction);
        }

        // else
        else {
            response = `Invalid subcommand ${sub}`;
        }

        await interaction.followUp(response);
    },
};

async function listWarnings(target, { guild, guildId }) {
    if (!target) return guild.getT("moderation:WARNINGS.NO_USER");
    if (target.user.bot) return guild.getT("moderation:WARNINGS.NO_BOTS");

    const warnings = await getWarningLogs(guildId, target.id);
    if (!warnings.length)
        return guild.getT("moderation:WARNINGS.NO_WARNINGS", { target: target.user.username });

    const acc = warnings
        .map((warning, i) => `${i + 1}. ${warning.reason} [By ${warning.admin.username}]`)
        .join("\n");
    const embed = new EmbedBuilder({
        author: {
            name: guild.getT("moderation:WARNINGS.WARNINGS_TITLE", {
                target: target.user.username,
            }),
        },
        description: acc,
    });

    return { embeds: [embed] };
}

async function clearWarnings(target, { guild, guildId }) {
    if (!target) return guild.getT("moderation:WARNINGS.NO_USER");
    if (target.user.bot) return guild.getT("moderation:WARNINGS.NO_BOTS");

    await clearWarningLogs(guildId, target.id);
    return guild.getT("moderation:WARNINGS.WARN_CLEAR", { target: target.user.username });
}
