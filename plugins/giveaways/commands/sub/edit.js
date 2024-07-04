const ems = require("enhanced-ms");

/**
 * @param {import('discord.js').GuildMember} member
 * @param {string} messageId
 * @param {number} [addDur]
 * @param {string} [newPrize]
 * @param {number} [newWinnerCount]
 */
module.exports = async (member, messageId, addDur, newPrize, newWinnerCount) => {
    const { guild } = member;
    if (!messageId) return guild.getT("giveaways:INVALID_MESSAGE_ID");

    // Permissions
    if (!member.permissions.has("ManageMessages")) {
        return guild.getT("giveaways:MEMBER_PERMS");
    }

    // duration
    const addDurationMs = addDur ? ems(addDur) : null;
    if (!addDurationMs || isNaN(addDurationMs)) {
        return guild.getT("giveaways:EDIT_INVALID_DURATION");
    }

    // winner count
    if (newWinnerCount && isNaN(newWinnerCount)) {
        return guild.getT("giveaways:EDIT_INVALID_WINNERS");
    }

    // Search with messageId
    const giveaway = member.client.giveawaysManager.giveaways.find(
        (g) => g.messageId === messageId && g.guildId === member.guild.id,
    );

    // If no giveaway was found
    if (!giveaway) return guild.getT("giveaways:NOT_FOUND", { messageId });

    try {
        await member.client.giveawaysManager.edit(messageId, {
            addTime: addDur || 0,
            newPrize: newPrize || giveaway.prize,
            newWinnerCount: newWinnerCount || giveaway.winnerCount,
            newExtraData: {
                hostTag: giveaway.extraData.hostTag,
                allowedRoles: giveaway.extraData.allowedRoles,
            },
        });

        return guild.getT("giveaways:EDIT_SUCCESS");
    } catch (error) {
        member.client.logger.error("Giveaway Edit", error);
        return guild.getT("giveaways:EDIT_ERROR");
    }
};
