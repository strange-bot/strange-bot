/**
 * @param {import('discord.js').GuildMember} member
 * @param {string} messageId
 */
module.exports = async (member, messageId) => {
    const { guild } = member;
    if (!messageId) return guild.getT("giveaways:INVALID_MESSAGE_ID");

    // Permissions
    if (!member.permissions.has("ManageMessages")) {
        return guild.getT("giveaways:MEMBER_PERMS");
    }

    // Search with messageId
    const giveaway = member.client.giveawaysManager.giveaways.find(
        (g) => g.messageId === messageId && g.guildId === member.guild.id,
    );

    // If no giveaway was found
    if (!giveaway) return guild.getT("giveaways:NOT_FOUND", { messageId });

    // Check if the giveaway is paused
    if (giveaway.pauseOptions.isPaused) return guild.getT("giveaways:ALREADY_PAUSED");

    try {
        await giveaway.pause();
        return guild.getT("giveaways:PAUSE_SUCCESS");
    } catch (error) {
        member.client.logger.error("Giveaway Pause", error);
        return guild.getT("giveaways:PAUSE_ERROR");
    }
};
