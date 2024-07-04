const { moveTarget } = require("../../utils");

module.exports = async ({ guild, member }, target, reason, channel) => {
    const response = await moveTarget(member, target, reason, channel);
    if (typeof response === "boolean") {
        return guild.getT("moderation:VOICE.MOVE_SUCCESS", {
            target: target.user.username,
            channel,
        });
    }
    if (response === "MEMBER_PERM") {
        return guild.getT("moderation:VOICE.MOVE_MEMBER_PERM", { target: target.user.username });
    }
    if (response === "BOT_PERM") {
        return guild.getT("moderation:VOICE.MOVE_BOT_PERM", { target: target.user.username });
    }
    if (response === "NO_VOICE") {
        return guild.getT("moderation:VOICE.MOVE_NO_VOICE", { target: target.user.username });
    }
    if (response === "TARGET_PERM") {
        return guild.getT("moderation:VOICE.MOVE_TARGET_PERM", {
            target: target.user.username,
            channel,
        });
    }
    if (response === "ALREADY_IN_CHANNEL") {
        return guild.getT("moderation:VOICE.MOVE_ALREADY_IN_CHANNEL", {
            target: target.user.username,
            channel,
        });
    }
    return guild.getT("moderation:VOICE.MOVE_ERROR", { target: target.user.username, channel });
};
