const { getInviteCache, cacheInvite } = require("../utils");

/**
 * @param {import('discord.js').Invite} invite
 */
module.exports = async (invite) => {
    const guild = invite.client.guilds.cache.get(invite.guild.id);

    const settings = guild.getSettings("invites");
    if (!settings.enabled) return;

    const cachedInvites = getInviteCache(guild);

    // Check if cache for the guild exists and then add it to cache
    if (cachedInvites) {
        cachedInvites.set(invite.code, cacheInvite(invite, false));
    }
};
