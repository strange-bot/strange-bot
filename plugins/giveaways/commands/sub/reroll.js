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

    // Check if the giveaway is ended
    if (!giveaway.ended) return guild.getT("giveaways:STILL_RUNNING");

    try {
        await giveaway.reroll();
        return guild.getT("giveaways:REROLL_SUCCESS");
    } catch (error) {
        member.client.logger.error("Giveaway Reroll", error);
        return guild.getT("giveaways:REROLL_ERROR");
    }
};
