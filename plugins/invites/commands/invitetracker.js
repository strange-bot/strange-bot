const { cacheGuildInvites, inviteCache } = require("../utils");
const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "invitetracker",
    description: "invites:TRACKER.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        aliases: ["invitetracking"],
        usage: "<ON|OFF>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "status",
                description: "invites:TRACKER.STATUS_DESC",
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

    async messageRun(message, args) {
        const status = args[0].toLowerCase();
        if (!["on", "off"].includes(status))
            return message.replyT("invites:TRACKER.INVALID_STATUS");
        const response = await setStatus(message, status);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const status = interaction.options.getString("status");
        const response = await setStatus(interaction, status);
        await interaction.followUp(response);
    },
};

async function setStatus({ guild }, input) {
    const settings = guild.getSettings("invites");
    const status = input.toUpperCase() === "ON" ? true : false;

    if (status) {
        if (!guild.members.me.permissions.has(["ManageGuild", "ManageChannels"])) {
            return guild.getT("invites:TRACKER.MISSING_PERMS");
        }

        const channelMissing = guild.channels.cache
            .filter(
                (ch) =>
                    ch.type === ChannelType.GuildText &&
                    !ch.permissionsFor(guild.members.me).has("ManageChannels"),
            )
            .map((ch) => ch.name);

        if (channelMissing.length > 1) {
            return guild.getT("invites:TRACKER.MISSING_PERMS_CHANNEL", {
                channels: channelMissing.join(", "),
            });
        }

        await cacheGuildInvites(guild);
    } else {
        inviteCache.clear();
    }

    settings.enabled = status;
    await guild.updateSettings();

    return status ? guild.getT("invites:TRACKER.ENABLED") : guild.getT("invites:TRACKER.DISABLED");
}
