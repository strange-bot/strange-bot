const { cacheGuildInvites } = require("../utils");

/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    for (const guild of client.guilds.cache.values()) {
        if (guild.getSettings("invites").enabled) cacheGuildInvites(guild);
    }
};
