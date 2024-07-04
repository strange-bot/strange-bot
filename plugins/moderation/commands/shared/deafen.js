const { deafenTarget } = require("../../utils");

module.exports = async ({ guild, member }, target, reason) => {
    const response = await deafenTarget(member, target, reason);
    if (typeof response === "boolean") {
        return guild.getT("moderation:VOICE.DEAFEN_SUCCESS", { target: target.user.username });
    }
    if (response === "MEMBER_PERM") {
        return guild.getT("moderation:VOICE.DEAFEN_MEMBER_PERM", { target: target.user.username });
    }
    if (response === "BOT_PERM") {
        return guild.getT("moderation:VOICE.DEAFEN_BOT_PERM", { target: target.user.username });
    }
    if (response === "NO_VOICE") {
        return guild.getT("moderation:VOICE.DEAFEN_NO_VOICE", { target: target.user.username });
    }
    if (response === "ALREADY_DEAFENED") {
        return guild.getT("moderation:VOICE.DEAFEN_ALREADY_DEAFENED", {
            target: target.user.username,
        });
    }
    return guild.getT("moderation:VOICE.DEAFEN_ERROR", { target: target.user.username });
};
