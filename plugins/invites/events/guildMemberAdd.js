const { inviteCache, cacheGuildInvites, checkInviteRewards } = require("../utils");
const { getMember } = require("../schemas/Invites");

/**
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (member) => {
    const { guild } = member;
    const settings = guild.getSettings("invites");
    if (!settings.enabled) return;

    if (member.user.bot) return {};

    const cachedInvites = inviteCache.get(guild.id);
    const newInvites = await cacheGuildInvites(guild);

    // return if no cached data
    if (!cachedInvites) return {};
    let usedInvite;

    // compare newInvites with cached invites
    usedInvite = newInvites.find(
        (inv) =>
            inv.uses !== 0 &&
            cachedInvites.get(inv.code) &&
            cachedInvites.get(inv.code).uses < inv.uses,
    );

    // Special case: Invitation was deleted after member's arrival and
    // just before GUILD_MEMBER_ADD (https://github.com/Androz2091/discord-invites-tracker/blob/29202ee8e85bb1651f19a466e2c0721b2373fefb/index.ts#L46)
    if (!usedInvite) {
        cachedInvites
            .sort((a, b) =>
                a.deletedTimestamp && b.deletedTimestamp
                    ? b.deletedTimestamp - a.deletedTimestamp
                    : 0,
            )
            .forEach((invite) => {
                if (
                    !newInvites.get(invite.code) && // If the invitation is no longer present
                    invite.maxUses > 0 && // If the invitation was indeed an invitation with a limited number of uses
                    invite.uses === invite.maxUses - 1 // What if the invitation was about to reach the maximum number of uses
                ) {
                    usedInvite = invite;
                }
            });
    }

    let inviterData = {};
    if (usedInvite) {
        const inviterId = usedInvite.code === guild.vanityURLCode ? "VANITY" : usedInvite.inviterId;

        // log invite data
        const memberDb = await getMember(guild.id, member.id);
        memberDb.inviter = inviterId;
        memberDb.code = usedInvite.code;
        await memberDb.save();

        // increment inviter's invites
        const inviterDb = await getMember(guild.id, inviterId);
        inviterDb.tracked += 1;
        await inviterDb.save();
        inviterData = inviterDb;
    }

    checkInviteRewards(guild, inviterData, true);

    // TODO: Temporarily attach inviterData to member object
    member.inviterData = inviterData;
    return inviterData;
};
