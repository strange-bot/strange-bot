/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    guild.client.logger.warn(`Guild Unavailable: ${guild.name}`);
};
