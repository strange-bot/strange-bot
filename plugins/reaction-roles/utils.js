const { getReactionRoles } = require("./schemas/ReactionRoles");

/**
 * @param {import('discord.js').MessageReaction} reaction
 */
async function getRole(reaction) {
    const { message, emoji } = reaction;
    if (!message || !message.channel) return;

    const rr = getReactionRoles(message.guildId, message.channelId, message.id);
    const emote = emoji.id ? emoji.id : emoji.toString();
    const found = rr.find((doc) => doc.emote === emote);

    const reactionRole = found ? await message.guild.roles.fetch(found.role_id) : null;
    return reactionRole;
}

module.exports = {
    getRole,
};
