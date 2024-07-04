const { getRole } = require("../utils");

/**
 * @param {import('discord.js').MessageReaction|import('discord.js').PartialMessageReaction} reaction
 * @param {import('discord.js').User} user
 */
module.exports = async (reaction, user) => {
    if (!reaction.message.guild) return;
    const settings = reaction.message.guild.getSettings("reaction-roles");
    if (!settings.enabled) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (ex) {
            return; // Possibly deleted
        }
    }

    const role = await getRole(reaction);
    if (!role) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member) return;

    await member.roles.remove(role).catch(() => {});
};
