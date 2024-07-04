const Settings = require("../../../src/base/Settings");

/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    if (!guild.available) return;
    guild.client.logger.info(`Guild Left: ${guild.name} Members: ${guild.memberCount}`);
    const settings = Settings.get(guild);
    settings.left_at = new Date();
    await settings.save();
};
