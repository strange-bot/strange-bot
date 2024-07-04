const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { findSuggestion, deleteSuggestionDb } = require("./schemas/Suggestions");
const { stripIndents } = require("common-tags");

/**
 * @param {import('discord.js').Message} message
 */
const getStats = (message) => {
    const settings = message.guild.getSettings("suggestion");
    const upVotes = (message.reactions.resolve(settings.upvote_emoji)?.count || 1) - 1;
    const downVotes = (message.reactions.resolve(settings.downvote_emoji)?.count || 1) - 1;

    return [upVotes, downVotes];
};

/**
 * @param {number} upVotes
 * @param {number} downVotes
 */
const getVotesMessage = (upVotes, downVotes) => {
    const total = upVotes + downVotes;
    if (total === 0) {
        return stripIndents`
  _Upvotes: NA_
  _Downvotes: NA_
  `;
    } else {
        return stripIndents`
  _Upvotes: ${upVotes} [${Math.round((upVotes / (upVotes + downVotes)) * 100)}%]_
  _Downvotes: ${downVotes} [${Math.round((downVotes / (upVotes + downVotes)) * 100)}%]_
  `;
    }
};

const hasPerms = (member, settings) => {
    return (
        member.permissions.has("ManageGuild") ||
        member.roles.cache.find((r) => settings.staff_roles.includes(r.id))
    );
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {string} messageId
 * @param {string} [reason]
 */
async function approveSuggestion(member, messageId, reason) {
    const { guild } = member;
    const settings = guild.getSettings("suggestion");

    // validate permissions
    if (!hasPerms(member, settings)) {
        return guild.getT("suggestion:HANDLER.APPROVE_PERMS");
    }

    // validate if document exists
    const doc = await findSuggestion(guild.id, messageId);
    if (!doc || !doc.channel_id) return guild.getT("suggestion:HANDLER.NOT_FOUND");
    if (doc.status === "APPROVED") return guild.getT("suggestion:HANDLER.ALREADY_APPROVED");

    const channel = guild.channels.cache.get(doc.channel_id);

    /**
     * @type {import('discord.js').Message}
     */
    let message;
    try {
        message = await channel.messages.fetch({ message: messageId, force: true });
    } catch (err) {
        return guild.getT("suggestion:HANDLER.MESSAGE_NOT_FOUND");
    }

    let buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("suggestion:APPROVE_BTN")
            .setLabel(guild.getT("suggestion:HANDLER.APPROVE_BTN"))
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("suggestion:REJECT_BTN")
            .setLabel(guild.getT("suggestion:HANDLER.REJECT_BTN"))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("suggestion:DELETE_BTN")
            .setLabel(guild.getT("suggestion:HANDLER.DELETE_BTN"))
            .setStyle(ButtonStyle.Secondary),
    );

    const approvedEmbed = new EmbedBuilder()
        .setDescription(message.embeds[0].data.description)
        .setColor(settings.approved_embed)
        .setAuthor({
            name: guild.getT("suggestion:HANDLER.APPROVE_EMBED_TITLE"),
        })
        .setFooter({
            text: guild.getT("suggestion:HANDLER.APPROVE_EMBED_FOOTER", {
                user: member.user.username,
            }),
            iconURL: member.displayAvatarURL(),
        })
        .setTimestamp();

    const fields = [];

    // add stats if it doesn't exist
    const statsField = message.embeds[0].fields.find(
        (field) => field.name === guild.getT("suggestion:HANDLER.STATS_FIELD"),
    );
    if (!statsField) {
        const [upVotes, downVotes] = getStats(message);
        doc.stats.upvotes = upVotes;
        doc.stats.downvotes = downVotes;
        fields.push({
            name: guild.getT("suggestion:HANDLER.STATS_FIELD"),
            value: getVotesMessage(upVotes, downVotes),
        });
    } else {
        fields.push(statsField);
    }

    // update reason
    if (reason)
        fields.push({
            name: guild.getT("suggestion:HANDLER.REASON_FIELD"),
            value: "```" + reason + "```",
        });

    approvedEmbed.addFields(fields);

    try {
        doc.status = "APPROVED";
        doc.status_updates.push({
            user_id: member.id,
            status: "APPROVED",
            reason,
            timestamp: new Date(),
        });

        let approveChannel;
        if (settings.approved_channel) {
            approveChannel = guild.channels.cache.get(settings.approved_channel);
        }

        // suggestions-approve channel is not configured
        if (!approveChannel) {
            await message.edit({ embeds: [approvedEmbed], components: [buttonsRow] });
            await message.reactions.removeAll();
        }

        // suggestions-approve channel is configured
        else {
            const sent = await approveChannel.send({
                embeds: [approvedEmbed],
                components: [buttonsRow],
            });
            doc.channel_id = approveChannel.id;
            doc.message_id = sent.id;
            await message.delete();
        }

        await doc.save();
        return guild.getT("suggestion:HANDLER.APPROVED");
    } catch (ex) {
        guild.client.logger.error("approveSuggestion", ex);
        return guild.getT("suggestion:HANDLER.APPROVE_FAILED");
    }
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {string} messageId
 * @param {string} [reason]
 */
async function rejectSuggestion(member, messageId, reason) {
    const { guild } = member;
    const settings = guild.getSettings("suggestion");

    // validate permissions
    if (!hasPerms(member, settings)) {
        return guild.getT("suggestion:HANDLER.REJECT_PERMS");
    }

    // validate if document exists
    const doc = await findSuggestion(guild.id, messageId);
    if (!doc || !doc.channel_id) return guild.getT("suggestion:HANDLER.NOT_FOUND");
    if (doc.is_rejected) return guild.getT("suggestion:HANDLER.ALREADY_REJECTED");

    const channel = guild.channels.cache.get(doc.channel_id);
    let message;
    try {
        message = await channel.messages.fetch({ message: messageId });
    } catch (err) {
        return guild.getT("suggestion:HANDLER.MESSAGE_NOT_FOUND");
    }

    let buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("suggestion:APPROVE_BTN")
            .setLabel(guild.getT("suggestion:HANDLER.APPROVE_BTN"))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("suggestion:REJECT_BTN")
            .setLabel(guild.getT("suggestion:HANDLER.REJECT_BTN"))
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("suggestion:DELETE_BTN")
            .setLabel(guild.getT("suggestion:HANDLER.DELETE_BTN"))
            .setStyle(ButtonStyle.Secondary),
    );

    const rejectedEmbed = new EmbedBuilder()
        .setDescription(message.embeds[0].data.description)
        .setColor(settings.rejected_embed)
        .setAuthor({
            name: guild.getT("suggestion:HANDLER.REJECTED_EMBED_TITLE"),
        })
        .setFooter({
            text: guild.getT("suggestion:HANDLER.REJECTED_EMBED_FOOTER", {
                user: member.user.username,
            }),
            iconURL: member.displayAvatarURL(),
        })
        .setTimestamp();

    const fields = [];

    // add stats if it doesn't exist
    const statsField = message.embeds[0].fields.find(
        (field) => field.name === guild.getT("suggestion:HANDLER.STATS_FIELD"),
    );
    if (!statsField) {
        const [upVotes, downVotes] = getStats(message);
        doc.stats.upvotes = upVotes;
        doc.stats.downvotes = downVotes;
        fields.push({
            name: guild.getT("suggestion:HANDLER.STATS_FIELD"),
            value: getVotesMessage(upVotes, downVotes),
        });
    } else {
        fields.push(statsField);
    }

    // update reason
    if (reason)
        fields.push({
            name: guild.getT("suggestion:HANDLER.REASON_FIELD"),
            value: "```" + reason + "```",
        });

    rejectedEmbed.addFields(fields);

    try {
        doc.status = "REJECTED";
        doc.status_updates.push({
            user_id: member.id,
            status: "REJECTED",
            reason,
            timestamp: new Date(),
        });

        let rejectChannel;
        if (settings.rejected_channel) {
            rejectChannel = guild.channels.cache.get(settings.rejected_channel);
        }

        // suggestions-reject channel is not configured
        if (!rejectChannel) {
            await message.edit({ embeds: [rejectedEmbed], components: [buttonsRow] });
            await message.reactions.removeAll();
        }

        // suggestions-reject channel is configured
        else {
            const sent = await rejectChannel.send({
                embeds: [rejectedEmbed],
                components: [buttonsRow],
            });
            doc.channel_id = rejectChannel.id;
            doc.message_id = sent.id;
            await message.delete();
        }

        await doc.save();
        return guild.getT("suggestion:HANDLER.REJECTED");
    } catch (ex) {
        guild.client.logger.error("rejectSuggestion", ex);
        return guild.getT("suggestion:HANDLER.REJECT_FAILED");
    }
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} messageId
 * @param {string} [reason]
 */
async function deleteSuggestion(member, channel, messageId, reason) {
    const { guild } = member;
    const settings = guild.getSettings("suggestion");

    // validate permissions
    if (!hasPerms(member, settings)) {
        return guild.getT("suggestion:HANDLER.DELETE_PERMS");
    }

    try {
        await channel.messages.delete(messageId);
        await deleteSuggestionDb(guild.id, messageId, member.id, reason);
        return guild.getT("suggestion:HANDLER.DELETED");
    } catch (ex) {
        guild.client.logger.error("deleteSuggestion", ex);
        return guild.getT("suggestion:HANDLER.DELETE_FAILED");
    }
}

module.exports = {
    approveSuggestion,
    rejectSuggestion,
    deleteSuggestion,
};
