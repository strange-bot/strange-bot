const { Collection } = require("discord.js");

const inviteCache = new Collection();
const getInviteCache = (guild) => inviteCache.get(guild.id);

const getEffectiveInvites = (inviteData = {}) =>
    inviteData.tracked + inviteData.added - inviteData.fake - inviteData.left || 0;

const cacheInvite = (invite, isVanity) => ({
    code: invite.code,
    uses: invite.uses,
    maxUses: invite.maxUses,
    inviterId: isVanity ? "VANITY" : invite.inviter?.id,
});

/**
 * This function caches all invites for the provided guild
 * @param {import("discord.js").Guild} guild
 */
async function cacheGuildInvites(guild) {
    if (!guild.members.me.permissions.has("ManageGuild")) return new Collection();
    const invites = await guild.invites.fetch();

    const tempMap = new Collection();
    invites.forEach((inv) => tempMap.set(inv.code, cacheInvite(inv)));
    if (guild.vanityURLCode) {
        tempMap.set(guild.vanityURLCode, cacheInvite(await guild.fetchVanityData(), true));
    }

    inviteCache.set(guild.id, tempMap);
    return tempMap;
}

/**
 * Add roles to inviter based on invites count
 * @param {import("discord.js").Guild} guild
 * @param {Object} inviterData
 * @param {boolean} isAdded
 */
const checkInviteRewards = async (guild, inviterData = {}, isAdded) => {
    const settings = guild.getSettings("invites");
    if (settings.ranks.length > 0 && inviterData?.member_id) {
        const inviter = await guild.members.fetch(inviterData?.member_id).catch(() => {});
        if (!inviter) return;

        const invites = getEffectiveInvites(inviterData);
        settings.ranks.forEach((reward) => {
            if (isAdded) {
                if (invites >= reward.invites && !inviter.roles.cache.has(reward._id)) {
                    inviter.roles.add(reward._id);
                }
            } else if (invites < reward.invites && inviter.roles.cache.has(reward._id)) {
                inviter.roles.remove(reward._id);
            }
        });
    }
};

module.exports = {
    inviteCache,
    getInviteCache,
    cacheInvite,
    getEffectiveInvites,
    cacheGuildInvites,
    checkInviteRewards,
};
