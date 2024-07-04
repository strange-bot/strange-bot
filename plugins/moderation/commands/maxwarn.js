const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "maxwarn",
    description: "moderation:MAXWARN.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "limit <number>",
                description: "moderation:MAXWARN.SUB_LIMIT_DESC",
            },
            {
                trigger: "action <timeout|kick|ban>",
                description: "moderation:MAXWARN.SUB_ACTION_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "limit",
                description: "moderation:MAXWARN.SUB_LIMIT_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "amount",
                        description: "moderation:MAXWARN.SUB_LIMIT_AMOUNT_DESC",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "action",
                description: "moderation:MAXWARN.SUB_ACTION_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "action",
                        description: "moderation:MAXWARN.SUB_ACTION_ACTION_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        choices: [
                            {
                                name: "TIMEOUT",
                                value: "TIMEOUT",
                            },
                            {
                                name: "KICK",
                                value: "KICK",
                            },
                            {
                                name: "BAN",
                                value: "BAN",
                            },
                        ],
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const input = args[0].toLowerCase();
        const settings = message.guild.getSettings("moderation");

        let response;
        if (input === "limit") {
            const max = parseInt(args[1]);
            if (isNaN(max) || max < 1) return message.replyT("moderation:MAXWARN.INVALID_LIMIT");
            response = await setLimit(message.guild, max, settings);
        }

        //
        else if (input === "action") {
            const action = args[1]?.toUpperCase();
            if (!action || !["TIMEOUT", "KICK", "BAN"].includes(action))
                return message.replyT("moderation:MAXWARN.INVALID_ACTION");
            response = await setAction(message.guild, action, settings);
        }

        //
        else {
            response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub: input });
        }

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("moderation");

        let response;
        if (sub === "limit") {
            response = await setLimit(
                interaction.guild,
                interaction.options.getInteger("amount"),
                settings,
            );
        }

        if (sub === "action") {
            response = await setAction(
                interaction.guild,
                interaction.options.getString("action"),
                settings,
            );
        }

        await interaction.followUp(response);
    },
};

async function setLimit(guild, limit, settings) {
    settings.max_warn.limit = limit;
    await guild.updateSettings();
    return guild.getT("moderation:MAXWARN.LIMIT_SET", { limit });
}

async function setAction(guild, action, settings) {
    if (action === "TIMEOUT") {
        if (!guild.members.me.permissions.has("ModerateMembers")) {
            return guild.geT("moderation:MAXWARN.TIMEOUT_PERM");
        }
    }

    if (action === "KICK") {
        if (!guild.members.me.permissions.has("KickMembers")) {
            return guild.getT("moderation:MAXWARN.KICK_PERM");
        }
    }

    if (action === "BAN") {
        if (!guild.members.me.permissions.has("BanMembers")) {
            return guild.getT("moderation:MAXWARN.BAN_PERM");
        }
    }

    settings.max_warn.action = action;
    await guild.updateSettings();
    return guild.getT("moderation:MAXWARN.ACTION_SET", { action });
}
