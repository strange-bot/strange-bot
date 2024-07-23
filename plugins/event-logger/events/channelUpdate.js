const { AuditLogEvent, PermissionsBitField, OverwriteType } = require("discord.js");
const { channelTypes, MiscUtils, EmbedUtils } = require("strange-sdk/utils");

/**
 * @param {import("discord.js").GuildBasedChannel} oldChannel
 * @param {import("discord.js").GuildBasedChannel} newChannel
 */
module.exports = async (oldChannel, newChannel) => {
    if (newChannel.isDMBased()) return;
    const guild = newChannel.guild;
    const settings = guild.getSettings("event-logger");
    if (!settings.enabled) return;
    const event = settings.events.find((doc) => doc.name === "CHANNEL_UPDATE");
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
        .fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 })
        .then((en) => en.entries.first());

    const executor =
        auditLog.target.id === newChannel.id
            ? `${auditLog.executor.toString()} [${auditLog.executor.id}]`
            : `Unknown`;
    const channelType = channelTypes(newChannel.type);

    // Return if category deleted, fires for every children channel and not worth logging in my opinion
    if (oldChannel.parent && !newChannel.parent) return;

    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("event-logger:EMBED.CH_UPDATE_TITLE") })
        .setDescription(
            guild.getT("event-logger:EMBED.CH_UPDATE_DESC", { channel: newChannel.toString() }),
        )
        .setFooter({ text: `${guild.getT("event-logger:EMBED.ID")}: ${newChannel.id}` });

    const fields = [
        {
            name: guild.getT("event-logger:EMBED.CH_TYPE"),
            value: channelType,
            inline: true,
        },
        {
            name: guild.getT("event-logger:EMBED.UPDATED_BY"),
            value: executor,
            inline: true,
        },
    ];

    // Name change
    if (oldChannel.name !== newChannel.name) {
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_NAME"),
            value: `\`${oldChannel.name}\` -> \`${newChannel.name}\``,
        });
    }

    // Category Changed
    if (oldChannel.parent?.id !== newChannel.parent?.id) {
        const oldCategory = oldChannel.parent || "None";
        const newCategory = newChannel.parent || "None";
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_CATEGORY"),
            value: `${oldCategory} -> ${newCategory}`,
        });
    }

    // Channel topic
    if ((oldChannel.topic || "") !== (newChannel.topic || "")) {
        const oldTopic = oldChannel.topic || "None";
        const newTopic = newChannel.topic || "None";
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_TOPIC"),
            value: `\`${oldTopic}\` -> \`${newTopic}\``,
        });
    }

    // NSFW
    if (oldChannel.nsfw !== newChannel.nsfw) {
        const oldNsfw = oldChannel.nsfw ? "Yes" : "No";
        const newNsfw = newChannel.nsfw ? "Yes" : "No";
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_NSFW"),
            value: `\`${oldNsfw}\` -> \`${newNsfw}\``,
        });
    }

    // Slowmode
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        const oldSlowmode = oldChannel.rateLimitPerUser
            ? MiscUtils.timeformat(oldChannel.rateLimitPerUser)
            : "NA";
        const newSlowmode = newChannel.rateLimitPerUser
            ? MiscUtils.timeformat(newChannel.rateLimitPerUser)
            : "NA";
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_SLOWMODE"),
            value: `\`${oldSlowmode}\` -> \`${newSlowmode}\``,
        });
    }

    // Bitrate
    if (oldChannel.bitrate !== newChannel.bitrate) {
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_BITRATE"),
            value: `\`${oldChannel.bitrate}kbps\` -> \`${newChannel.bitrate}kbps\``,
        });
    }

    // User limit for voice
    if (oldChannel.userLimit !== newChannel.userLimit) {
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_USERS"),
            value: `\`${oldChannel.userLimit} users\` -> \`${newChannel.userLimit} users\``,
        });
    }

    // Overwrites changes
    const changes = getDifference(
        guild,
        oldChannel.permissionOverwrites.cache,
        newChannel.permissionOverwrites.cache,
    );
    if (changes.length > 0) {
        fields.push({
            name: guild.getT("event-logger:EMBED.CH_PERMS"),
            value: changes.join("\n"),
        });
    }

    if (!fields.length) return;
    embed.setFields(fields);

    logChannel.safeSend({ embeds: [embed] }).catch(() => {});
};

/**
 * Get Permissions overwrites changes
 * @param {import("discord.js").Guild} guild
 * @param {import("discord.js").Collection<string, import("discord.js").PermissionOverwrites} oldOverwrites
 * @param {import("discord.js").Collection<string, import("discord.js").PermissionOverwrites} newOverwrites
 */
const getDifference = (guild, oldOverwrites, newOverwrites) => {
    const changes = [];

    // Function to get the permission names from the bitfield
    const getPermissionNames = (bitfield) => {
        return new PermissionsBitField(bitfield).toArray();
    };

    // Check for added or modified permission overwrites
    newOverwrites.forEach((newOverwrite, id) => {
        const oldOverwrite = oldOverwrites.get(id);

        if (!oldOverwrite) {
            changes.push(
                `${guild.getT("event-logger:EMBED.CH_PERMS_ADD")} ${newOverwrite.type === OverwriteType.Member ? `<@${id}>` : `<@&${id}>`}`,
            );
        } else {
            const oldAllow = getPermissionNames(oldOverwrite.allow.bitfield);
            const newAllow = getPermissionNames(newOverwrite.allow.bitfield);
            const oldDeny = getPermissionNames(oldOverwrite.deny.bitfield);
            const newDeny = getPermissionNames(newOverwrite.deny.bitfield);

            const addedAllow = newAllow.filter((p) => !oldAllow.includes(p));
            const removedAllow = oldAllow.filter((p) => !newAllow.includes(p));
            const addedDeny = newDeny.filter((p) => !oldDeny.includes(p));
            const removedDeny = oldDeny.filter((p) => !newDeny.includes(p));
            const changeMap = new Map();
            if (
                addedAllow.length ||
                removedAllow.length ||
                addedDeny.length ||
                removedDeny.length
            ) {
                changes.push(
                    `${guild.getT("event-logger:EMBED.CH_PERMS_MODIFY")} ${OverwriteType.Member ? `<@${id}>` : `<@&${id}>`}:`,
                );

                addedAllow.forEach((p) => changeMap.set(p, `none -> allow`));
                removedAllow.forEach((p) => changeMap.set(p, `allow -> none`));
                addedDeny.forEach((p) => changeMap.set(p, `none -> deny`));
                removedDeny.forEach((p) => changeMap.set(p, `deny -> none`));

                // Handle changes from allow to deny or vice versa
                oldAllow.forEach((p) => {
                    if (newDeny.includes(p)) {
                        changeMap.set(p, `allow -> deny`);
                    }
                });
                oldDeny.forEach((p) => {
                    if (newAllow.includes(p)) {
                        changeMap.set(p, `deny -> allow`);
                    }
                });
                changeMap.forEach((v, id) => changes.push(`- ${id}: ${v}`));
            }
        }
    });

    // Check for removed permission overwrites
    oldOverwrites.forEach((oldOverwrite, id) => {
        if (!newOverwrites.has(id)) {
            changes.push(
                `${guild.getT("event-logger:EMBED.CH_PERMS_REMOVE")} ${oldOverwrite.type === OverwriteType.Member ? `<@${id}>` : `<@&${id}>`}`,
            );
        }
    });

    return changes;
};
