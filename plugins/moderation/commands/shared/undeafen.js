const { unDeafenTarget } = require("../../utils");

module.exports = async ({ guild, member }, target, reason) => {
    const response = await unDeafenTarget(member, target, reason);
    if (typeof response === "boolean") {
        return guild.getT("moderation:VOICE.UNDEAFEN_SUCCESS", { target: target.user.username });
    }
    if (response === "MEMBER_PERM") {
        return guild.getT("moderation:VOICE.UNDEAFEN_MEMBER_PERM", {
            target: target.user.username,
        });
    }
    if (response === "BOT_PERM") {
        return guild.getT("moderation:VOICE.UNDEAFEN_BOT_PERM", { target: target.user.username });
    }
    if (response === "NO_VOICE") {
        return guild.getT("moderation:VOICE.UNDEAFEN_NO_VOICE", { target: target.user.username });
    }
    if (response === "NOT_DEAFENED") {
        return guild.getT("moderation:VOICE.UNDEAFEN_NOT_DEAFENED", {
            target: target.user.username,
        });
    }
    return guild.getT("moderation:VOICE.UNDEAFEN_ERROR", { target: target.user.username });
};
