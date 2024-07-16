const { AuditLogEvent } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");

/**
 * Log when emoji is created
 * @param {import("discord.js").GuildEmoji} oldEmoji
 * @param {import("discord.js").GuildEmoji} newEmoji
 */
module.exports = async (oldEmoji, newEmoji) => {
    const guild = newEmoji.guild;
    const settings = guild.getSettings("event-logger");
    const event = settings.events.find((doc) => doc.name === "EMOJI_UPDATE");
    const logChannelId = event?.log_channel || settings.log_channel;

    if (!event?.enabled || !logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    if (!guild.members.me.permissions.has("ViewAuditLog")) {
        return logChannel.safeSend(
            guild.getT("event-logger:MISSING_PERMISSIONS", { permission: "View Audit Log" }),
        );
    }

    const auditLog = await guild
        .fetchAuditLogs({ type: AuditLogEvent.EmojiUpdate, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.target.id === newEmoji.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("event-logger:EMBED.EMOJI_UPDATE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.EMOJI_UPDATE_DESC", { emoji: newEmoji.toString() }),
        )
        .setThumbnail(newEmoji.imageURL())
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${newEmoji.id}` });

    const fields = [
        {
            name: guild.getT("event-logger:EMBED.UPDATED_BY"),
            value: executor,
            inline: true,
        },
    ];

    // Name changes
    if (oldEmoji.name !== newEmoji.name) {
        fields.push({
            name: guild.getT("event-logger:EMBED.EMOJI_NAME"),
            value: `\`${oldEmoji.name}\` -> \`${newEmoji.name}\``,
        });
    }

    // Roles changes
    if (!oldEmoji.roles.cache.equals(newEmoji.roles.cache)) {
        const changes = [];
        const oldRoles = oldEmoji.roles.cache;
        const newRoles = newEmoji.roles.cache;
        newRoles.forEach((role, id) => {
            if (!oldRoles.has(id)) changes.push(`+ Added ${role}`);
        });

        oldRoles.forEach((role, id) => {
            if (!newRoles.has(id)) changes.push(`\\- Removed ${role}`);
        });
        fields.push({
            name: guild.getT("event-logger:EMBED.EMOJI_ROLES"),
            value: changes.join("\n"),
        });
    }

    if (!fields.length) return;
    embed.setFields(fields);

    logChannel.send({ embeds: [embed] }).catch(() => {});
};
