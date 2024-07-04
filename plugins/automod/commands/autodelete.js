const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "autodelete",
    description: "automod:DELETE.DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 2,
        subcommands: [
            {
                trigger: "attachments <on|off>",
                description: "automod:DELETE.ANTI_ATTACH",
            },
            {
                trigger: "invites <on|off>",
                description: "automod:DELETE.ANTI_INVITE",
            },
            {
                trigger: "links <on|off>",
                description: "automod:DELETE.ANTI_LINKS",
            },
            {
                trigger: "maxlines <number>",
                description: "automod:DELETE.ANTI_MAXLINES",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "attachments",
                description: "automod:DELETE.ANTI_ATTACH",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:DELETE.ANTI_ATTACH_STATUS",
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
                name: "invites",
                description: "automod:DELETE.ANTI_INVITE",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:DELETE.ANTI_INVITE_STATUS",
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
                name: "links",
                description: "automod:DELETE.ANTI_LINKS",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:DELETE.ANTI_LINKS_STATUS",
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
                name: "maxlines",
                description: "automod:DELETE.ANTI_MAXLINES",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "amount",
                        description: "automod:DELETE.ANTI_MAXLINES_AMOUNT",
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

        if (sub == "attachments") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.replyT("automod:DELETE.INVALID_STATUS");
            response = await antiAttachments(settings, status, message.guild);
        }

        //
        else if (sub === "invites") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.replyT("automod:DELETE.INVALID_STATUS");
            response = await antiInvites(settings, status, message.guild);
        }

        //
        else if (sub == "links") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.replyT("automod:DELETE.INVALID_STATUS");
            response = await antilinks(settings, status, message.guild);
        }

        //
        else if (sub === "maxlines") {
            const max = args[1];
            response = await maxLines(settings, max, message.guild);
        }

        //
        else response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub });
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("automod");
        let response;

        if (sub == "attachments") {
            response = await antiAttachments(
                settings,
                interaction.options.getString("status"),
                interaction.guild,
            );
        } else if (sub === "invites") {
            response = await antiInvites(
                settings,
                interaction.options.getString("status"),
                interaction.guild,
            );
        } else if (sub == "links") {
            response = await antilinks(
                settings,
                interaction.options.getString("status"),
                interaction.guild,
            );
        } else if (sub === "maxlines") {
            response = await maxLines(
                settings,
                interaction.options.getInteger("amount"),
                interaction.guild,
            );
        } else response = interaction.guild.getT("common:INVALID_SUBCOMMAND", { sub });

        await interaction.followUp(response);
    },
};

async function antiAttachments(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_attachments = status;
    await guild.updateSettings();
    return status
        ? guild.getT("automod:DELETE.ANTI_ATTACHMENTS_ON")
        : guild.getT("automod:DELETE.ANTI_ATTACHMENTS_OFF");
}

async function antiInvites(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_invites = status;
    await guild.updateSettings();
    return status
        ? guild.getT("automod:DELETE.ANTI_INVITES_ON")
        : guild.getT("automod:DELETE.ANTI_INVITES_OFF");
}

async function antilinks(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_links = status;
    await guild.updateSettings();
    return status
        ? guild.getT("automod:DELETE.ANTI_LINKS_ON")
        : guild.getT("automod:DELETE.ANTI_LINKS_OFF");
}

async function maxLines(settings, input, guild) {
    const lines = Number.parseInt(input);
    if (isNaN(lines)) return guild.getT("automod:DELETE.ANTI_MAXLINES_NAN");

    settings.max_lines = lines;
    await guild.updateSettings();
    return input === 0
        ? guild.getT("automod:DELETE.ANTI_MAXLINES_DISABLED")
        : guild.getT("automod:DELETE.ANTI_MAXLINES_SET", { amount: lines });
}
