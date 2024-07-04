/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    client.logger.info("Initializing giveaways manager...");
    client.giveawaysManager
        ._init()
        .then((_) => client.logger.success("Giveaway Manager initialized"));
};
