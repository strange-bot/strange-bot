const antispamCache = new Map();
const MESSAGE_SPAM_THRESHOLD = 3000;

function cleanupCache() {
    setInterval(
        () => {
            antispamCache.forEach((value, key) => {
                if (Date.now() - value.timestamp > MESSAGE_SPAM_THRESHOLD) {
                    antispamCache.delete(key);
                }
            });
        },
        10 * 60 * 1000,
    );
}

function shouldModerate(message) {
    const { member, guild, channel } = message;

    // Ignore if bot cannot delete channel messages
    if (!channel.permissionsFor(guild.members.me)?.has("ManageMessages")) return false;

    // Ignore Possible Guild Moderators
    if (member.permissions.has(["KickMembers", "BanMembers", "ManageGuild"])) return false;

    // Ignore Possible Channel Moderators
    if (channel.permissionsFor(message.member).has("ManageMessages")) return false;
    return true;
}

module.exports = {
    antispamCache,
    MESSAGE_SPAM_THRESHOLD,
    cleanupCache,
    shouldModerate,
};
