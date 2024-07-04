const { vMuteTarget } = require("../../utils");

module.exports = async ({ guild, member }, target, reason) => {
    const response = await vMuteTarget(member, target, reason);
    if (typeof response === "boolean") {
        return guild.getT("moderation:VOICE.VMUTE_SUCCESS", { target: target.user.username });
    }
    if (response === "MEMBER_PERM") {
        return guild.getT("moderation:VOICE.VMUTE_MEMBER_PERM", { target: target.user.username });
    }
    if (response === "BOT_PERM") {
        return guild.getT("moderation:VOICE.VMUTE_BOT_PERM", { target: target.user.username });
    }
    if (response === "NO_VOICE") {
        return guild.getT("moderation:VOICE.VMUTE_NO_VOICE", { target: target.user.username });
    }
    if (response === "ALREADY_MUTED") {
        return guild.getT("moderation:VOICE.VMUTE_ALREADY_MUTED", { target: target.user.username });
    }
    return guild.getT("moderation:VOICE.VMUTE_ERROR", { target: target.user.username });
};
