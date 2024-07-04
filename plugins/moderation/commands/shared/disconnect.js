const { disconnectTarget } = require("../../utils");

module.exports = async ({ guild, member }, target, reason) => {
    const response = await disconnectTarget(member, target, reason);
    if (typeof response === "boolean") {
        return guild.getT("moderation:VOICE.KICK_SUCCESS", { target: target.user.username });
    }
    if (response === "MEMBER_PERM") {
        return guild.getT("moderation:VOICE.KICK_MEMBER_PERM", { target: target.user.username });
    }
    if (response === "BOT_PERM") {
        return guild.getT("moderation:VOICE.KICK_BOT_PERM", { target: target.user.username });
    }
    if (response === "NO_VOICE") {
        return guild.getT("moderation:VOICE.KICK_NO_VOICE", { target: target.user.username });
    }
    return guild.getT("moderation:VOICE.KICK_ERROR", { target: target.user.username });
};
