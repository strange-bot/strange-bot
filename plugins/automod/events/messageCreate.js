const { MiscUtils, Logger, EmbedUtils } = require("strange-sdk/utils");
const { getMember } = require("../schemas/Strikes");
const { addAutoModLogToDb } = require("../schemas/AutomodLogs");

const { antispamCache, MESSAGE_SPAM_THRESHOLD, shouldModerate } = require("../utils");

let addModAction;
try {
    addModAction = require("../../moderation/utils").addModAction;
} catch (ex) {
    Logger.warn("Moderation plugin not found, disabling automod moderation actions");
    addModAction = () => {};
}

/**
 * This function saves stats for a new message
 * @param {import("discord.js").Message} message
 */
module.exports = async (message) => {
    if (message.isCommand) return;
    if (message.system || message.webhookId) return;
    if (message.author.bot && message.author.id === message.guild.members.me.id) return;

    const settings = message.guild.getSettings("automod");

    if (settings.wh_channels.includes(message.channelId)) return;
    if (!settings.debug && !shouldModerate(message)) return;

    const { channel, member, guild, content, author, mentions } = message;
    const logChannel = settings.log_channel
        ? channel.guild.channels.cache.get(settings.log_channel)
        : null;

    let shouldDelete = false;
    let strikesTotal = 0;

    const fields = [];

    // Max mentions
    if (mentions.members.size > settings.max_mentions) {
        fields.push({
            name: guild.getT("automod:HANDLER.FIELD_MENTIONS"),
            value: `${mentions.members.size}/${settings.max_mentions}`,
            inline: true,
        });
        // strikesTotal += mentions.members.size - settings.max_mentions;
        strikesTotal += 1;
    }

    // Maxrole mentions
    if (mentions.roles.size > settings.max_role_mentions) {
        fields.push({
            name: guild.getT("automod:HANDLER.FIELD_ROLE_MENTIONS"),
            value: `${mentions.roles.size}/${settings.max_role_mentions}`,
            inline: true,
        });
        // strikesTotal += mentions.roles.size - settings.max_role_mentions;
        strikesTotal += 1;
    }

    if (settings.anti_massmention > 0) {
        // check everyone mention
        if (mentions.everyone) {
            fields.push({
                name: guild.getT("automod:HANDLER.FIELD_EVERYONE"),
                value: "✓",
                inline: true,
            });
            strikesTotal += 1;
        }

        // check user/role mentions
        if (mentions.users.size + mentions.roles.size > settings.anti_massmention) {
            fields.push({
                name: guild.getT("automod:HANDLER.FIELD_ROLE_USER_MENTIONS"),
                value: `${mentions.users.size + mentions.roles.size}/${settings.anti_massmention}`,
                inline: true,
            });
            // strikesTotal += mentions.users.size + mentions.roles.size - settings.anti_massmention;
            strikesTotal += 1;
        }
    }

    // Max Lines
    if (settings.max_lines > 0) {
        const count = content.split("\n").length;
        if (count > settings.max_lines) {
            fields.push({
                name: guild.getT("automod:HANDLER.FIELD_MAX_LINES"),
                value: `${count}/${settings.max_lines}`,
                inline: true,
            });
            shouldDelete = true;
            // strikesTotal += Math.ceil((count - settings.max_lines) / settings.max_lines);
            strikesTotal += 1;
        }
    }

    // Anti Attachments
    if (settings.anti_attachments) {
        if (message.attachments.size > 0) {
            fields.push({
                name: guild.getT("automod:HANDLER.FIELD_ATTACH"),
                value: "✓",
                inline: true,
            });
            shouldDelete = true;
            strikesTotal += 1;
        }
    }

    // Anti links
    if (settings.anti_links) {
        if (MiscUtils.containsLink(content)) {
            fields.push({
                name: guild.getT("automod:HANDLER.FIELD_LINKS"),
                value: "✓",
                inline: true,
            });
            shouldDelete = true;
            strikesTotal += 1;
        }
    }

    // Anti Spam
    if (!settings.anti_links && settings.anti_spam) {
        if (MiscUtils.containsLink(content)) {
            const key = author.id + "|" + message.guildId;
            if (antispamCache.has(key)) {
                let antispamInfo = antispamCache.get(key);
                if (
                    antispamInfo.channelId !== message.channelId &&
                    antispamInfo.content === content &&
                    Date.now() - antispamInfo.timestamp < MESSAGE_SPAM_THRESHOLD
                ) {
                    fields.push({
                        name: guild.getT("automod:HANDLER.FIELD_ANTISPAM"),
                        value: "✓",
                        inline: true,
                    });
                    shouldDelete = true;
                    strikesTotal += 1;
                }
            } else {
                let antispamInfo = {
                    channelId: message.channelId,
                    content,
                    timestamp: Date.now(),
                };
                antispamCache.set(key, antispamInfo);
            }
        }
    }

    // Anti Invites
    if (!settings.anti_links && settings.anti_invites) {
        if (MiscUtils.containsDiscordInvite(content)) {
            fields.push({
                name: guild.getT("automod:HANDLER.FIELD_INVITES"),
                value: "✓",
                inline: true,
            });
            shouldDelete = true;
            strikesTotal += 1;
        }
    }

    // delete message if deletable
    if (shouldDelete && message.deletable) {
        message
            .delete()
            .then(() => channel.safeSend(guild.getT("automod:HANDLER.AUTO_DELETED"), 5))
            .catch(() => {});
    }

    if (strikesTotal > 0) {
        // add strikes to member
        const memberDb = await getMember(guild.id, author.id);
        memberDb.strikes += strikesTotal;

        // log to db
        const reason = fields.map((field) => field.name + ": " + field.value).join("\n");
        addAutoModLogToDb(member, content, reason, strikesTotal).catch(() => {});

        // send automod log
        if (logChannel) {
            const logEmbed = EmbedUtils.embed()
                .setAuthor({ name: guild.getT("automod:HANDLER.AUTO_LOG_TITLE") })
                .setThumbnail(author.displayAvatarURL())

                .addFields(fields)
                .setDescription(
                    `**${guild.getT("automod:HANDLER.AUTO_LOG_CHANNEL")}:** ${channel.toString()}\n**${guild.getT(
                        "automod:HANDLER.AUTO_LOG_CONTENT",
                    )}:**\n${content}`,
                )
                .setFooter({
                    text: `By ${author.username} | ${author.id}`,
                    iconURL: author.avatarURL(),
                });

            if (settings.embed_colors.log) {
                logEmbed.setColor(settings.embed_colors.log);
            }

            logChannel.safeSend({ embeds: [logEmbed] });
        }

        // DM strike details
        const strikeEmbed = EmbedUtils.embed()
            .setThumbnail(guild.iconURL())
            .setAuthor({ name: guild.getT("automod:HANDLER.AUTO_DM_TITLE") })
            .addFields(fields)
            .setDescription(
                guild.getT("automod:HANDLER.AUTO_DM_DESC", {
                    guild: guild.name,
                    strikes: strikesTotal,
                    total: memberDb.strikes,
                    max: settings.strikes,
                }),
            );

        if (settings.embed_colors.dm) {
            strikeEmbed.setColor(settings.embed_colors.dm);
        }

        author.send({ embeds: [strikeEmbed] }).catch((ex) => {});

        // check if max strikes are received
        if (memberDb.strikes >= settings.strikes) {
            // Reset Strikes
            memberDb.strikes = 0;

            // Add Moderation Action
            await addModAction(
                guild.members.me,
                member,
                guild.getT("automod:HANDLER.AUTO_ACTION_REASON"),
                settings.action,
            ).catch(() => {});
        }

        await memberDb.save();
    }
};
