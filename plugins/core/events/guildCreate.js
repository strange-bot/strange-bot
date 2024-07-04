/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    if (!guild.available) return;
    if (!guild.members.cache.has(guild.ownerId))
        await guild.fetchOwner({ cache: true }).catch(() => {});
    guild.client.logger.info(`Guild Joined: ${guild.name} Members: ${guild.memberCount}`);
    const settings = guild.getSettings("core");
    settings.guild_name = guild.name;
    settings.joined_at = new Date();
    await guild.updateSettings();

    // Register interactions
    guild.client.wait(5000).then(async () => {
        await guild.client.registerInteractions(guild.id);
        guild.client.logger.success(`Registered interactions in ${guild.name}`);
    });
};
