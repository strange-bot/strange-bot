const { approveSuggestion, rejectSuggestion } = require("../utils");
const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const { MiscUtils } = require("strange-sdk/utils");

const CHANNEL_PERMS = [
    "ViewChannel",
    "SendMessages",
    "EmbedLinks",
    "ManageMessages",
    "ReadMessageHistory",
];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "suggestion",
    description: "suggestion:SUGGESTION.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 2,
        subcommands: [
            {
                trigger: "channel <#channel|off>",
                description: "suggestion:SUGGESTION.SUB_CHANNEL",
            },
            {
                trigger: "appch <#channel>",
                description: "suggestion:SUGGESTION.SUB_APPCH",
            },
            {
                trigger: "rejch <#channel>",
                description: "suggestion:SUGGESTION.SUB_REJCH",
            },
            {
                trigger: "approve <messageId> [reason]",
                description: "suggestion:SUGGESTION.SUB_APPROVE",
            },
            {
                trigger: "reject <messageId> [reason]",
                description: "suggestion:SUGGESTION.SUB_REJECT",
            },
            {
                trigger: "staffadd <roleId>",
                description: "suggestion:SUGGESTION.SUB_STAFFADD",
            },
            {
                trigger: "staffremove <roleId>",
                description: "suggestion:SUGGESTION.SUB_STAFFREMOVE",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "status",
                description: "suggestion:SUGGESTION.SUB_STATUS",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "status",
                        description: "suggestion:SUGGESTION.SUB_STATUS_STATUS",
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
                name: "channel",
                description: "suggestion:SUGGESTION.SUB_CHANNEL",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel_name",
                        description: "suggestion:SUGGESTION.SUB_CHANNEL_NAME",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                        required: false,
                    },
                ],
            },
            {
                name: "appch",
                description: "suggestion:SUGGESTION.SUB_APPCH",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel_name",
                        description: "suggestion:SUGGESTION.SUB_APPCH_NAME",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                        required: false,
                    },
                ],
            },
            {
                name: "rejch",
                description: "suggestion:SUGGESTION.SUB_REJCH",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel_name",
                        description: "suggestion:SUGGESTION.SUB_REJCH_NAME",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                        required: false,
                    },
                ],
            },
            {
                name: "approve",
                description: "suggestion:SUGGESTION.SUB_APPROVE",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "suggestion:SUGGESTION.SUB_COMMON_MESSAGE",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "suggestion:SUGGESTION.SUB_APPROVE_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "reject",
                description: "suggestion:SUGGESTION.SUB_REJECT",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "suggestion:SUGGESTION.SUB_COMMON_MESSAGE",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "suggestion:SUGGESTION.SUB_REJECT_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "staffadd",
                description: "suggestion:SUGGESTION.SUB_STAFFADD",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "role",
                        description: "suggestion:SUGGESTION.SUB_STAFFADD_ROLE",
                        type: ApplicationCommandOptionType.Role,
                        required: true,
                    },
                ],
            },
            {
                name: "staffremove",
                description: "suggestion:SUGGESTION.SUB_STAFFREMOVE",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "role",
                        description: "suggestion:SUGGESTION.SUB_STAFFREMOVE_ROLE",
                        type: ApplicationCommandOptionType.Role,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0];
        const { guild } = message;
        const settings = guild.getSettings("suggestion");
        let response;

        // channel
        if (sub == "channel") {
            const input = args[1];
            let matched = message.guild.findMatchingChannels(input);
            if (matched.length == 0)
                response = guild.getT("common:NO_MATCH_CHANNEL", { query: input });
            else if (matched.length > 1)
                response = guild.getT("common:MULTIPLE_MATCH_CHANNELS", { query: input });
            else response = await setChannel(guild, settings, matched[0]);
        }

        // appch
        else if (sub == "appch") {
            const input = args[1];
            let matched = message.guild.findMatchingChannels(input);
            if (matched.length == 0)
                response = guild.getT("common:NO_MATCH_CHANNEL", { query: input });
            else if (matched.length > 1)
                response = guild.getT("common:MULTIPLE_MATCH_CHANNELS", { query: input });
            else response = await setApprovedChannel(guild, settings, matched[0]);
        }

        // appch
        else if (sub == "rejch") {
            const input = args[1];
            let matched = message.guild.findMatchingChannels(input);
            if (matched.length == 0)
                response = guild.getT("common:NO_MATCH_CHANNEL", { query: input });
            else if (matched.length > 1)
                response = guild.getT("common:MULTIPLE_MATCH_CHANNELS", { query: input });
            else response = await setRejectedChannel(guild, settings, matched[0]);
        }

        // approve
        else if (sub == "approve") {
            const messageId = args[1];
            const reason = args.slice(2).join(" ");
            response = await approveSuggestion(message.member, messageId, reason);
        }

        // reject
        else if (sub == "reject") {
            const messageId = args[1];
            const reason = args.slice(2).join(" ");
            response = await rejectSuggestion(message.member, messageId, reason);
        }

        // staffadd
        else if (sub == "staffadd") {
            const input = args[1];
            let matched = message.guild.findMatchingRoles(input);
            if (matched.length == 0)
                response = guild.getT("common:NO_MATCH_ROLE", { query: input });
            else if (matched.length > 1)
                response = guild.getT("common:MULTIPLE_MATCH_ROLES", { query: input });
            else response = await addStaffRole(guild, settings, matched[0]);
        }

        // staffremove
        else if (sub == "staffremove") {
            const input = args[1];
            let matched = message.guild.findMatchingRoles(input);
            if (matched.length == 0)
                response = guild.getT("common:NO_MATCH_ROLE", { query: input });
            else if (matched.length > 1)
                response = guild.getT("common:MULTIPLE_MATCH_ROLES", { query: input });
            else response = await removeStaffRole(guild, settings, matched[0]);
        }

        // else
        else response = guild.getT("common:INVALID_SUBCOMMAND", { sub });
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const settings = guild.getSettings("suggestion");
        let response;

        // channel
        if (sub == "channel") {
            const channel = interaction.options.getChannel("channel_name");
            response = await setChannel(guild, settings, channel);
        }

        // app_channel
        else if (sub == "appch") {
            const channel = interaction.options.getChannel("channel_name");
            response = await setApprovedChannel(guild, settings, channel);
        }

        // rej_channel
        else if (sub == "rejch") {
            const channel = interaction.options.getChannel("channel_name");
            response = await setRejectedChannel(guild, settings, channel);
        }

        // approve
        else if (sub == "approve") {
            const messageId = interaction.options.getString("message_id");
            const reason = interaction.options.getString("reason");
            response = await approveSuggestion(interaction.member, messageId, reason);
        }

        // reject
        else if (sub == "reject") {
            const messageId = interaction.options.getString("message_id");
            const reason = interaction.options.getString("reason");
            response = await rejectSuggestion(interaction.member, messageId, reason);
        }

        // staffadd
        else if (sub == "staffadd") {
            const role = interaction.options.getRole("role");
            response = await addStaffRole(guild, settings, role);
        }

        // staffremove
        else if (sub == "staffremove") {
            const role = interaction.options.getRole("role");
            response = await removeStaffRole(guild, settings, role);
        }

        // else
        else response = "Not a valid subcommand";
        await interaction.followUp(response);
    },
};

async function setChannel(guild, settings, channel) {
    if (!channel) {
        settings.channel_id = null;
        await guild.updateSettings();
        return guild.getT("suggestion:SUGGESTION.CHANNEL_DISABLED");
    }

    if (!channel.permissionsFor(channel.guild.members.me).has(CHANNEL_PERMS)) {
        return guild.getT("suggestion:SUGGESTION.CHANNEL_PERMS", {
            channel: channel.name,
            perms: MiscUtils.parsePermissions(CHANNEL_PERMS),
        });
    }

    settings.channel_id = channel.id;
    await guild.updateSettings();
    return guild.getT("suggestion:SUGGESTION.CHANNEL_SET", { channel: channel.name });
}

async function setApprovedChannel(guild, settings, channel) {
    if (!channel) {
        settings.approved_channel = null;
        await guild.updateSettings();
        return guild.getT("suggestion:SUGGESTION.APPROVED_DISABLED");
    }

    if (!channel.permissionsFor(channel.guild.members.me).has(CHANNEL_PERMS)) {
        return guild.getT("suggestion:SUGGESTION.CHANNEL_PERMS", {
            channel: channel.name,
            perms: MiscUtils.parsePermissions(CHANNEL_PERMS),
        });
    }

    settings.approved_channel = channel.id;
    await guild.updateSettings();
    return guild.getT("suggestion:SUGGESTION.APPROVED_SET", { channel: channel.name });
}

async function setRejectedChannel(guild, settings, channel) {
    if (!channel) {
        settings.rejected_channel = null;
        await guild.updateSettings();
        return guild.getT("suggestion:SUGGESTION.REJECTED_DISABLED");
    }

    if (!channel.permissionsFor(channel.guild.members.me).has(CHANNEL_PERMS)) {
        return guild.getT("suggestion:SUGGESTION.CHANNEL_PERMS", {
            channel: channel.name,
            perms: MiscUtils.parsePermissions(CHANNEL_PERMS),
        });
    }

    settings.rejected_channel = channel.id;
    await guild.updateSettings();
    return guild.getT("suggestion:SUGGESTION.REJECTED_SET", { channel: channel.name });
}

async function addStaffRole(guild, settings, role) {
    if (settings.staff_roles.includes(role.id)) {
        return guild.getT("suggestion:SUGGESTION.STAFF_ROLE_EXISTS", { role: role.name });
    }
    settings.staff_roles.push(role.id);
    await guild.updateSettings();
    return guild.getT("suggestion:SUGGESTION.STAFF_ROLE_ADDED", { role: role.name });
}

async function removeStaffRole(guild, settings, role) {
    if (!settings.staff_roles.includes(role.id)) {
        return guild.getT("suggestion:SUGGESTION.STAFF_ROLE_NOT_EXISTS", { role: role.name });
    }
    settings.staff_roles.splice(settings.staff_roles.indexOf(role.id), 1);
    await guild.updateSettings();
    return guild.getT("suggestion:SUGGESTION.STAFF_ROLE_REMOVED", { role: role.name });
}
