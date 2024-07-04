const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { stripIndent } = require("common-tags");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "automod",
    description: "automod:AUTOMOD.CONFIG_DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "status",
                description: "automod:AUTOMOD.CONFIG_STATUS",
            },
            {
                trigger: "log <#channel|off>",
                description: "automod:AUTOMOD.CONFIG_LOG",
            },
            {
                trigger: "strikes <number>",
                description: "automod:AUTOMOD.CONFIG_STRIKES",
            },
            {
                trigger: "action <TIMEOUT|KICK|BAN>",
                description: "automod:AUTOMOD.CONFIG_ACTION",
            },
            {
                trigger: "debug <on|off>",
                description: "automod:AUTOMOD.CONFIG_DEBUG",
            },
            {
                trigger: "whitelist",
                description: "automod:AUTOMOD.CONFIG_WHITELIST_LIST",
            },
            {
                trigger: "whitelistadd <channel>",
                description: "automod:AUTOMOD.CONFIG_WHITELIST_ADD",
            },
            {
                trigger: "whitelistremove <channel>",
                description: "automod:AUTOMOD.CONFIG_WHITELIST_REM",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "status",
                description: "automod:AUTOMOD.CONFIG_STATUS",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "log",
                description: "automod:AUTOMOD.CONFIG_LOG",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel",
                        description: "automod:AUTOMOD.CONFIG_LOG_CHANNEL",
                        required: false,
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                    },
                ],
            },
            {
                name: "strikes",
                description: "automod:AUTOMOD.CONFIG_STRIKES",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "amount",
                        description: "automod:AUTOMOD.CONFIG_STRIKES_AMOUNT",
                        required: true,
                        type: ApplicationCommandOptionType.Integer,
                    },
                ],
            },
            {
                name: "action",
                description: "automod:AUTOMOD.CONFIG_ACTION",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "action",
                        description: "automod:AUTOMOD.CONFIG_ACTION_TYPE",
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
            {
                name: "debug",
                description: "automod:AUTOMOD.CONFIG_DEBUG",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "automod:AUTOMOD.CONFIG_DEBUG_STATUS",
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
                name: "whitelist",
                description: "automod:AUTOMOD.CONFIG_WHITELIST_LIST",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "whitelistadd",
                description: "automod:AUTOMOD.CONFIG_WHITELIST_ADD",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel",
                        description: "automod:AUTOMOD.CONFIG_WHITELIST_ADD_CH",
                        required: true,
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                    },
                ],
            },
            {
                name: "whitelistremove",
                description: "automod:AUTOMOD.CONFIG_WHITELIST_REM",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel",
                        description: "automod:AUTOMOD.CONFIG_WHITELIST_REM_CH",
                        required: true,
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const input = args[0].toLowerCase();
        const settings = message.guild.getSettings("automod");

        let response;
        if (input === "status") {
            response = await getStatus(settings, message.guild);
        } else if (input === "strikes") {
            const strikes = args[1];
            if (isNaN(strikes) || Number.parseInt(strikes) < 1) {
                return message.safeReply("Strikes must be a valid number greater than 0");
            }
            response = await setStrikes(settings, strikes, message.guild);
        } else if (input === "action") {
            const action = args[1].toUpperCase();
            if (!action || !["TIMEOUT", "KICK", "BAN"].includes(action))
                return message.safeReply(
                    "Not a valid action. Action can be `Timeout`/`Kick`/`Ban`",
                );
            response = await setAction(settings, message.guild, action);
        } else if (input === "debug") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.safeReply("Invalid status. Value must be `on/off`");
            response = await setDebug(settings, status, message.guild);
        }

        // log
        else if (input === "log") {
            if (args[1] === "off") response = await setChannel(null, settings, message.guild);
            else {
                const match = message.guild.findMatchingChannels(args[1]);
                if (!match.length) return message.safeReply(`No channel found matching ${args[1]}`);
                response = await setChannel(match[0], settings, message.guild);
            }
        }

        // whitelist
        else if (input === "whitelist") {
            response = getWhitelist(message.guild, settings);
        }

        // whitelist add
        else if (input === "whitelistadd") {
            const match = message.guild.findMatchingChannels(args[1]);
            if (!match.length) return message.safeReply(`No channel found matching ${args[1]}`);
            response = await whiteListAdd(settings, match[0].id, message.guild);
        }

        // whitelist remove
        else if (input === "whitelistremove") {
            const match = message.guild.findMatchingChannels(args[1]);
            if (!match.length) return message.safeReply(`No channel found matching ${args[1]}`);
            response = await whiteListRemove(settings, match[0].id, message.guild);
        }

        //
        else response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub: input });
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = interaction.guild.getSettings("automod");

        let response;

        if (sub === "status") {
            response = await getStatus(settings, interaction.guild);
        } else if (sub === "strikes") {
            response = await setStrikes(
                settings,
                interaction.options.getInteger("amount"),
                interaction.guild,
            );
        } else if (sub === "action") {
            response = await setAction(
                settings,
                interaction.guild,
                interaction.options.getString("action"),
            );
        } else if (sub === "debug") {
            response = await setDebug(
                settings,
                interaction.options.getString("status"),
                interaction.guild,
            );
        } else if (sub === "log") {
            const channelId = interaction.options.getChannel("channel").id;
            response = await setChannel(channelId, settings, interaction.guild);
        } else if (sub === "whitelist") {
            response = getWhitelist(interaction.guild, settings);
        } else if (sub === "whitelistadd") {
            const channelId = interaction.options.getChannel("channel").id;
            response = await whiteListAdd(settings, channelId, interaction.guild);
        } else if (sub === "whitelistremove") {
            const channelId = interaction.options.getChannel("channel").id;
            response = await whiteListRemove(settings, channelId, interaction.guild);
        } else response = interaction.guild.getT("common:INVALID_SUBCOMMAND", { sub });

        await interaction.followUp(response);
    },
};

async function getStatus(settings, guild) {
    const logChannel = settings.log_channel
        ? guild.channels.cache.get(settings.log_channel).toString()
        : "Not Configured";

    // String Builder
    let desc = stripIndent`
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_MAXLINES")}**: ${settings.max_lines || "NA"}
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_MASSMENTION")}**: ${settings.anti_massmention > 0 ? "✓" : "✕"}
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_ATTACH")}**: ${settings.anti_attachment ? "✓" : "✕"}
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_LINKS")}**: ${settings.anti_links ? "✓" : "✕"}
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_INVITE")}**: ${settings.anti_invites ? "✓" : "✕"}
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_SPAM")}**: ${settings.anti_spam ? "✓" : "✕"}
    ❯ **${guild.getT("automod:AUTOMOD.STATUS_EMBED_GHOSTPING")}**: ${settings.anti_ghostping ? "✓" : "✕"}
  `;

    const embed = EmbedUtils.embed({ description: desc })
        .setAuthor({
            name: guild.getT("automod:AUTOMOD.STATUS_EMBED_TITLE"),
            iconURL: guild.iconURL(),
        })
        .addFields(
            {
                name: guild.getT("automod:AUTOMOD.STATUS_EMBED_LOG"),
                value: logChannel,
                inline: true,
            },
            {
                name: guild.getT("automod:AUTOMOD.STATUS_EMBED_STRIKES"),
                value: settings.strikes.toString(),
                inline: true,
            },
            {
                name: guild.getT("automod:AUTOMOD.STATUS_EMBED_ACTION"),
                value: settings.action,
                inline: true,
            },
            {
                name: guild.getT("automod:AUTOMOD.STATUS_EMBED_DEBUG"),
                value: settings.debug ? "✓" : "✕",
                inline: true,
            },
        );

    return { embeds: [embed] };
}

async function setStrikes(settings, strikes, guild) {
    settings.strikes = strikes;
    await guild.updateSettings();
    return guild.getT("automod:AUTOMOD.STRIKES_SET", { amount: strikes });
}

async function setAction(settings, guild, action) {
    if (action === "TIMEOUT") {
        if (!guild.members.me.permissions.has("ModerateMembers")) {
            return guild.getT("automod:AUTOMOD.TIMEOUT_NO_PERMS");
        }
    }

    if (action === "KICK") {
        if (!guild.members.me.permissions.has("KickMembers")) {
            return guild.getT("automod:AUTOMOD.KICK_NO_PERMS");
        }
    }

    if (action === "BAN") {
        if (!guild.members.me.permissions.has("BanMembers")) {
            guild.getT("automod:AUTOMOD.BAN_NO_PERMS");
        }
    }

    settings.action = action;
    await guild.updateSettings();
    return guild.getT("automod:AUTOMOD.ACTION_SET", { action });
}

async function setDebug(settings, input, guild) {
    const status = input.toLowerCase() === "on" ? true : false;
    settings.debug = status;
    await guild.updateSettings();
    return status
        ? guild.getT("automod:AUTOMOD.DEBUG_ENABLED")
        : guild.getT("automod:AUTOMOD.DEBUG_DISABLED");
}

async function setChannel(targetChannel, settings, guild) {
    if (!targetChannel && !settings.log_channel) {
        return guild.getT("automod:AUTOMOD.LOG_CHANNEL_DISABLED");
    }

    if (targetChannel && !targetChannel.canSendEmbeds()) {
        return guild.getT("automod:AUTOMOD.LOG_CHANNEL_NO_PERMS");
    }

    settings.log_channel = targetChannel?.id;
    await guild.updateSettings();
    return targetChannel
        ? guild.getT("automod:AUTOMOD.LOG_CHANNEL_SET", { channel: targetChannel.toString() })
        : guild.getT("automod:AUTOMOD.LOG_CHANNEL_REMOVED");
}

function getWhitelist(guild, settings) {
    const whitelist = settings.wh_channels;
    if (!whitelist || !whitelist.length) return guild.getT("automod:AUTOMOD.WHITELIST_NONE");

    const channels = [];
    for (const channelId of whitelist) {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) continue;
        if (channel) channels.push(channel.toString());
    }

    return guild.getT("automod:AUTOMOD.WHITELIST_LIST", { channels: channels.join(", ") });
}

async function whiteListAdd(settings, channelId, guild) {
    if (settings.wh_channels.includes(channelId))
        return guild.getT("automod:AUTOMOD.WHITELIST_ALREADY");
    settings.wh_channels.push(channelId);
    await guild.updateSettings();
    return guild.getT("automod:AUTOMOD.WHITELIST_ADDED");
}

async function whiteListRemove(settings, channelId, guild) {
    if (!settings.wh_channels.includes(channelId))
        return guild.getT("automod:AUTOMOD.WHITELIST_NOT");
    settings.wh_channels.splice(settings.wh_channels.indexOf(channelId), 1);
    await guild.updateSettings();
    return guild.getT("automod:AUTOMOD.WHITELIST_REMOVED");
}
