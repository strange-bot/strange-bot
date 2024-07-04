const user = require("../shared/user");
const channelInfo = require("../shared/channel");
const guildInfo = require("../shared/guild");
const avatar = require("../shared/avatar");
const emojiInfo = require("../shared/emoji");
const botInfo = require("../shared/botstats");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "info",
    description: "information:INFO.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: false,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "user",
                description: "information:INFO.SUB_USER_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "name",
                        description: "information:INFO.SUB_USER_NAME_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "channel",
                description: "information:INFO.SUB_CHANNEL_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "name",
                        description: "information:INFO.SUB_CHANNEL_NAME_DESC",
                        type: ApplicationCommandOptionType.Channel,
                        required: false,
                    },
                ],
            },
            {
                name: "guild",
                description: "information:INFO.SUB_GUILD_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "bot",
                description: "information:INFO.SUB_BOT_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "avatar",
                description: "information:INFO.SUB_AVATAR_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "name",
                        description: "information:INFO.SUB_AVATAR_NAME_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "emoji",
                description: "information:INFO.SUB_EMOJI_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "name",
                        description: "information:INFO.SUB_EMOJI_NAME_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
        ],
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        let response;

        // user
        if (sub === "user") {
            let targetUser = interaction.options.getUser("name") || interaction.user;
            let target = await interaction.guild.members.fetch(targetUser);
            response = user(target);
        }

        // channel
        else if (sub === "channel") {
            let targetChannel = interaction.options.getChannel("name") || interaction.channel;
            response = channelInfo(targetChannel);
        }

        // guild
        else if (sub === "guild") {
            response = await guildInfo(interaction.guild);
        }

        // bot
        else if (sub === "bot") {
            response = botInfo(interaction);
        }

        // avatar
        else if (sub === "avatar") {
            let target = interaction.options.getUser("name") || interaction.user;
            response = avatar(interaction.guild, target);
        }

        // emoji
        else if (sub === "emoji") {
            let emoji = interaction.options.getString("name");
            response = emojiInfo(interaction.guild, emoji);
        }

        // return
        else {
            return interaction.followUpT("common:INVALID_SUBCOMMAND", { sub });
        }

        await interaction.followUp(response);
    },
};
