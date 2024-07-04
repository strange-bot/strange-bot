const { MiscUtils } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "uptime",
    description: "information:BOT.SUB_UPTIME_DESC",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
    },

    async messageRun(message, args) {
        await message.replyT("information:BOT.UPTIME", {
            time: MiscUtils.timeformat(process.uptime()),
        });
    },
};
