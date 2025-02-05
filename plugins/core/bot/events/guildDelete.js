const DBClient = require("strange-db-client");

/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    if (!guild.available) return;
    guild.client.logger.info(`Guild Left: ${guild.name} Members: ${guild.memberCount}`);
    await DBClient.getInstance().leaveGuild(guild);
};
