const { vUnmuteTarget } = require("../../utils");

module.exports = async ({ guild, member }, target, reason) => {
    const response = await vUnmuteTarget(member, target, reason);
    if (typeof response === "boolean") {
        return guild.getT("moderation:VOICE.VUNMUTE_SUCCESS", { target: target.user.username });
    }
    if (response === "MEMBER_PERM") {
        return guild.getT("moderation:VOICE.VUNMUTE_MEMBER_PERM", { target: target.user.username });
    }
    if (response === "BOT_PERM") {
        return guild.getT("moderation:VOICE.VUNMUTE_BOT_PERM", { target: target.user.username });
    }
    if (response === "NO_VOICE") {
        return guild.getT("moderation:VOICE.VUNMUTE_NO_VOICE", { target: target.user.username });
    }
    if (response === "NOT_MUTED") {
        return guild.getT("moderation:VOICE.VUNMUTE_NOT_MUTED", { target: target.user.username });
    }
    return guild.getT("moderation:VOICE.VUNMUTE_ERROR", { target: target.user.username });
};
