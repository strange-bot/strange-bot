const deafen = require("../shared/deafen");
const vmute = require("../shared/vmute");
const vunmute = require("../shared/vunmute");
const undeafen = require("../shared/undeafen");
const disconnect = require("../shared/disconnect");
const move = require("../shared/move");
const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "voice",
    description: "moderation:VOICE.DESCRIPTION",
    userPermissions: ["MuteMembers", "MoveMembers", "DeafenMembers"],
    botPermissions: ["MuteMembers", "MoveMembers", "DeafenMembers"],
    command: {
        enabled: false,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "mute",
                description: "moderation:VOICE.SUB_MUTE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:VOICE.SUB_MUTE_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "moderation:VOICE.SUB_MUTE_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "unmute",
                description: "moderation:VOICE.SUB_UNMUTE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:VOICE.SUB_UNMUTE_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "moderation:VOICE.SUB_UNMUTE_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "deafen",
                description: "moderation:VOICE.SUB_DEAFEN_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:VOICE.SUB_DEAFEN_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "moderation:VOICE.SUB_DEAFEN_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "undeafen",
                description: "moderation:VOICE.SUB_UNDEAFEN_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:VOICE.SUB_UNDEAFEN_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "moderation:VOICE.SUB_UNDEAFEN_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "kick",
                description: "moderation:VOICE.SUB_KICK_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:VOICE.SUB_KICK_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "moderation:VOICE.SUB_KICK_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
            {
                name: "move",
                description: "moderation:VOICE.SUB_MOVE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "moderation:VOICE.SUB_MOVE_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "channel",
                        description: "moderation:VOICE.SUB_MOVE_CHANNEL",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
                        required: true,
                    },
                    {
                        name: "reason",
                        description: "moderation:VOICE.SUB_MOVE_REASON",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                ],
            },
        ],
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const reason = interaction.options.getString("reason");

        const user = interaction.options.getUser("user");
        const target = await interaction.guild.members.fetch(user.id);

        let response;

        if (sub === "mute") response = await vmute(interaction, target, reason);
        else if (sub === "unmute") response = await vunmute(interaction, target, reason);
        else if (sub === "deafen") response = await deafen(interaction, target, reason);
        else if (sub === "undeafen") response = await undeafen(interaction, target, reason);
        else if (sub === "kick") response = await disconnect(interaction, target, reason);
        else if (sub == "move") {
            const channel = interaction.options.getChannel("channel");
            response = await move(interaction, target, reason, channel);
        }

        await interaction.followUp(response);
    },
};
