const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "modlog",
    description: "moderation:MODLOG.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<#channel|off>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "channel",
                description: "moderation:MODLOG.CHANNEL_DESC",
                required: false,
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildText],
            },
        ],
    },

    async messageRun(message, args) {
        const input = args[0].toLowerCase();
        const settings = message.guild.getSettings("moderation");
        let targetChannel;

        if (input === "none" || input === "off" || input === "disable") targetChannel = null;
        else {
            if (message.mentions.channels.size === 0) return message.replyT("");
            targetChannel = message.mentions.channels.first();
        }

        const response = await setChannel(message, targetChannel, settings);
        return message.safeReply(response);
    },

    async interactionRun(interaction) {
        const settings = interaction.guild.getSettings("moderation");
        const channel = interaction.options.getChannel("channel");
        const response = await setChannel(interaction, channel, settings);
        return interaction.followUp(response);
    },
};

async function setChannel({ guild }, targetChannel, settings) {
    if (!targetChannel && !settings.modlog_channel) {
        return guild.getT("moderation:MODLOG.ALREADY_DISABLED");
    }

    if (targetChannel && !targetChannel.canSendEmbeds()) {
        return guild.getT("moderation:MODLOG.CHANNEL_PERMS");
    }

    settings.modlog_channel = targetChannel?.id;
    await guild.updateSettings();

    return targetChannel
        ? guild.getT("moderation:MODLOG.SUCCESS", { channel: targetChannel.toString() })
        : guild.getT("moderation:MODLOG.DISABLED");
}
