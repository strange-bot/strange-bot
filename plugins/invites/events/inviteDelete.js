const { getInviteCache } = require("../utils");

/**
 * @param {import('discord.js').Invite} invite
 */
module.exports = async (invite) => {
    const guild = invite.client.guilds.cache.get(invite.guild.id);

    const settings = guild.getSettings("invites");
    if (!settings.enabled) return;

    const cachedInvites = getInviteCache(invite?.guild);

    // Check if invite code exists in the cache
    if (cachedInvites && cachedInvites.get(invite.code)) {
        cachedInvites.get(invite.code).deletedTimestamp = Date.now();
    }
};
