const { init, updateCounterChannels } = require("../handler");

/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    for (const guild of client.guilds.cache.values()) {
        const settings = guild.getSettings("counter");

        // initialize counter
        if (settings.counters.length > 0) {
            await init(guild, settings);
        }
    }

    setInterval(() => updateCounterChannels(client), 10 * 60 * 1000);
};
