/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    client.logger.success(`Logged in as ${client.user.tag}! (${client.user.id})`);
    client.logger.info(`Serving ${client.guilds.cache.size} servers`);

    // Register Interactions
    client.wait(5000).then(() => {
        client.guilds.cache.forEach(async (guild) => {
            await client.registerInteractions(guild.id);
        });

        client.logger.success("Successfully registered interactions");
    });
};
