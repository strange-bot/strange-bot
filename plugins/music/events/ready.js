/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    client.musicManager.connect(client.user.id);
    client.logger.success("Music Manager initialized");
};
