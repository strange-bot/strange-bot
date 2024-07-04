const { checkInviteRewards } = require("../utils");
const { getMember } = require("../schemas/Invites");

/**
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (member) => {
    const { guild, user } = member;

    const settings = guild.getSettings("invites");
    if (!settings.enabled) return;
    const inviteData = await getMember(guild.id, user.id);

    let inviterData = {};
    if (inviteData.inviter) {
        const inviterId = inviteData.inviter === "VANITY" ? "VANITY" : inviteData.inviter;
        const inviterDb = await getMember(guild.id, inviterId);
        inviterDb.left += 1;
        await inviterDb.save();
        inviterData = inviterDb;
    }

    checkInviteRewards(guild, inviterData, false);

    // TODO: Temporarily attach inviterData to member object
    member.inviterData = inviterData;
    return inviterData;
};
