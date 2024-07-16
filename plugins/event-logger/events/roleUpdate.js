const { AuditLogEvent } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");

/**
 * @param {import('discord.js').Role} oldRole
 * @param {import("discord.js").Role} newRole
 */
module.exports = async (oldRole, newRole) => {
    const guild = newRole.guild;
    const settings = guild.getSettings("event-logger");
    const event = settings.events.find((doc) => doc.name === "ROLE_UPDATE");
    const logChannelId = event?.log_channel || settings.log_channel;

    if (!event?.enabled || !logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    // return if role was created by a bot (bot's role)
    if (newRole.managed) return;

    if (!guild.members.me.permissions.has("ViewAuditLog")) {
        return logChannel.safeSend(
            guild.getT("event-logger:MISSING_PERMISSIONS", { permission: "View Audit Log" }),
        );
    }

    const auditLog = await guild
        .fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.targetId === newRole.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("event-logger:EMBED.ROLE_UPDATE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.ROLE_UPDATE_DESC", { role: oldRole.toString() }),
        )
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${newRole.id}` });

    const fields = [
        {
            name: guild.getT("event-logger:EMBED.UPDATED_BY"),
            value: executor,
        },
    ];

    // Name changes
    if (oldRole.name !== newRole.name) {
        fields.push({
            name: guild.getT("event-logger:EMBED.ROLE_NAME"),
            value: `\`${oldRole.name}\` -> \`${newRole.name}\``,
        });
    }

    // Position
    if (oldRole.rawPosition !== newRole.rawPosition) {
        fields.push({
            name: guild.getT("event-logger:EMBED.ROLE_POSITION"),
            value: `\`${oldRole.rawPosition}\` -> \`${newRole.rawPosition}\``,
        });
    }

    // Icon change
    if (oldRole.icon !== newRole.icon) {
        if (!oldRole.icon && newRole.icon) {
            fields.push({
                name: guild.getT("event-logger:EMBED.ROLE_ICON"),
                value: `${guild.getT("event-logger:EMBED.ROLE_ICON_ADDED")}: [image](${newRole.iconURL()})`,
            });
        } else if (oldRole.icon && !newRole.icon) {
            fields.push({
                name: "Icon",
                value: `${guild.getT("event-logger:EMBED.ROLE_ICON_REMOVED")}: [image](${oldRole.iconURL()})`,
            });
        } else {
            fields.push({
                name: "Icon",
                value: `${guild.getT("event-logger:EMBED.ROLE_ICON_MODIFIED")}: [image](${newRole.iconURL()})`,
            });
        }
    }

    // Color changed
    if (oldRole.hexColor !== newRole.hexColor) {
        fields.push({
            name: guild.getT("event-logger:EMBED.ROLE_COLOR"),
            value: `\`${oldRole.hexColor || "none"}\` -> \`${newRole.hexColor || "none"}\``,
        });
    }

    // Permissions changes
    const changes = getDifference(oldRole.permissions, newRole.permissions);
    if (changes.length > 0) {
        fields.push({
            name: guild.getT("event-logger:EMBED.ROLE_PERMISSIONS"),
            value: changes.join("\n"),
        });
    }

    // Hoisted
    if (oldRole.hoist !== newRole.hoist) {
        const oldHoist = oldRole.hoist ? "Yes" : "No";
        const newHoist = newRole.hoist ? "Yes" : "No";
        fields.push({
            name: guild.getT("event-logger:EMBED.ROLE_HOIST"),
            value: `\`${oldHoist}\` -> \`${newHoist}\``,
        });
    }

    if (!fields.length) return;
    embed.setFields(fields);

    logChannel.send({ embeds: [embed] }).catch(() => {});
};

/**
 * Get permission differences
 * @param {import("discord.js").PermissionsBitField} oldPerm
 * @param {import("discord.js").PermissionsBitField} newPerm
 * @returns {string[]}
 */
const getDifference = (oldPerm, newPerm) => {
    const oldPermissions = oldPerm.toArray();
    const newPermissions = newPerm.toArray();
    const changes = [];
    // Added
    newPermissions.forEach((perm) => {
        if (!oldPermissions.includes(perm)) changes.push(`+ **${perm}**`);
    });

    // Removed
    oldPermissions.forEach((perm) => {
        if (!newPermissions.includes(perm)) changes.push(`\\- **${perm}**`);
    });
    return changes;
};
