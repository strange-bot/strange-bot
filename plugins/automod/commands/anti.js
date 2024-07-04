const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "anti",
    description: "automod:ANTI.DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 2,
        subcommands: [
            {
                trigger: "ghostping <on|off>",
                description: "automod:ANTI.GHOSTPING",
            },
            {
                trigger: "spam <on|off>",
                description: "automod:ANTI.SPAM",
            },
            {
                trigger: "massmention <on|off> [threshold]",
                description: "automod:ANTI.MASS_MENTION",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "ghostping",
                description: "automod:ANTI.GHOSTPING",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:ANTI.GHOSTPING_STATUS",
                        required: true,
                        type: ApplicationCommandOptionType.String,
                        choices: [
                            {
                                name: "ON",
                                value: "ON",
                            },
                            {
                                name: "OFF",
                                value: "OFF",
                            },
                        ],
                    },
                ],
            },
            {
                name: "spam",
                description: "automod:ANTI.SPAM",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:ANTI.SPAM_STATUS",
                        required: true,
                        type: ApplicationCommandOptionType.String,
                        choices: [
                            {
                                name: "ON",
                                value: "ON",
                            },
                            {
                                name: "OFF",
                                value: "OFF",
                            },
                        ],
                    },
                ],
            },
            {
                name: "massmention",
                description: "automod:ANTI.MASS_MENTION",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:ANTI.MASS_MENTION_STATUS",
                        required: true,
                        type: ApplicationCommandOptionType.String,
                        choices: [
                            {
                                name: "ON",
                                value: "ON",
                            },
                            {
                                name: "OFF",
                                value: "OFF",
                            },
                        ],
                    },
                    {
                        name: "threshold",
                        description: "automod:ANTI.MASS_MENTION_THRESHOLD",
                        required: true,
                        type: ApplicationCommandOptionType.Integer,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const settings = message.guild.getSettings("automod");
        const sub = args[0].toLowerCase();

        let response;
        if (sub == "ghostping") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.safeReply("Invalid status. Value must be `on/off`");
            response = await antiGhostPing(settings, status, message.guild);
        }

        //
        else if (sub == "spam") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.safeReply("Invalid status. Value must be `on/off`");
            response = await antiSpam(settings, status, message.guild);
        }

        //
        else if (sub === "massmention") {
            const status = args[1].toLowerCase();
            const threshold = args[2] || 3;
            if (!["on", "off"].includes(status))
                return message.safeReply("Invalid status. Value must be `on/off`");
            response = await antiMassMention(settings, status, threshold, message.guild);
        }

        //
        else response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub });
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("automod");

        let response;
        if (sub == "ghostping")
            response = await antiGhostPing(
                settings,
                interaction.options.getString("status"),
                interaction.guild,
            );
        else if (sub == "spam")
            response = await antiSpam(
                settings,
                interaction.options.getString("status"),
                interaction.guild,
            );
        else if (sub === "massmention") {
            response = await antiMassMention(
                settings,
                interaction.options.getString("status"),
                interaction.options.getInteger("threshold"),
                interaction.guild,
            );
        } else response = interaction.guild.getT("common:INVALID_SUBCOMMAND", { sub });

        await interaction.followUp(response);
    },
};

async function antiGhostPing(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_ghostping = status;
    await guild.updateSettings();
    return status
        ? guild.getT("automod:ANTI.GHOSTPING_ENABLED")
        : guild.getT("automod:ANTI.GHOSTPING_DISABLED");
}

async function antiSpam(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_spam = status;
    await guild.updateSettings();
    return status
        ? guild.getT("automod:ANTI.SPAM_ENABLED")
        : guild.getT("automod:ANTI.SPAM_DISABLED");
}

async function antiMassMention(settings, input, threshold, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    if (!status) {
        settings.anti_massmention = 0;
    } else {
        settings.anti_massmention = threshold;
    }
    await guild.updateSettings();
    return status
        ? guild.getT("automod:ANTI.MASS_MENTION_ENABLED", { threshold })
        : guild.getT("automod:ANTI.MASS_MENTION_DISABLED");
}
