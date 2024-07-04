const { ChannelType } = require("discord.js");
const counterUpdateQueue = [];

/**
 * Fetches the member stats for the guild
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<[number, number, number]>} [total, bots, members]
 */
async function fetchMemberStats(guild) {
    const all = await guild.members.fetch({
        force: false,
        cache: false,
    });
    const total = all.size;
    const bots = all.filter((mem) => mem.user.bot).size;
    const members = total - bots;
    return [total, bots, members];
}

/**
 * Updates the counter channel for all the guildId's present in the update queue
 * @param {import('discord.js').Client} client
 */
async function updateCounterChannels(client) {
    counterUpdateQueue.forEach(async (guildId) => {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        try {
            const settings = guild.getSettings("counter");

            const all = guild.memberCount;
            const bots = settings.bots;
            const members = all - bots;

            for (const config of settings.counters) {
                const chId = config.channel_id;
                const vc = guild.channels.cache.get(chId);
                if (!vc) continue;

                let channelName;
                if (config.counter_type.toUpperCase() === "USERS")
                    channelName = `${config.name} : ${all}`;
                if (config.counter_type.toUpperCase() === "MEMBERS")
                    channelName = `${config.name} : ${members}`;
                if (config.counter_type.toUpperCase() === "BOTS")
                    channelName = `${config.name} : ${bots}`;

                if (vc.manageable)
                    vc.setName(channelName).catch((err) =>
                        vc.client.logger.error("Set Name error: ", err),
                    );
            }
        } catch (ex) {
            client.logger.error(`Error updating counter channels for guildId: ${guildId}`, ex);
        } finally {
            // remove guildId from cache
            const i = counterUpdateQueue.indexOf(guild.id);
            if (i > -1) counterUpdateQueue.splice(i, 1);
        }
    });
}

/**
 * Initialize guild counters at startup
 * @param {import("discord.js").Guild} guild
 * @param {Object} settings
 */
async function init(guild, settings) {
    if (
        settings.counters.find((doc) =>
            ["MEMBERS", "BOTS"].includes(doc.counter_type.toUpperCase()),
        )
    ) {
        const stats = await fetchMemberStats(guild);
        settings.bots = stats[1]; // update bot count in database
        await guild.updateSettings();
    }

    // schedule for update
    if (!counterUpdateQueue.includes(guild.id)) counterUpdateQueue.push(guild.id);
    return true;
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} type
 * @param {string} name
 * @param {object} settings
 */
async function setupCounter(guild, type, name, settings) {
    try {
        let channelName = name;

        const exists = settings.counters.find((v) => v.counter_type.toUpperCase() === type);
        if (exists) {
            const currCh = guild.channels.cache.get(exists.channel_id);
            const currName = currCh ? currCh.name.split(":")[0] : null;
            if (currName === name) {
                return "counter:ALREADY_EXISTS";
            } else {
                const existingCount = parseInt(currCh.name.split(":")[1].trim());
                await currCh.setName(`${name} : ${existingCount}`);

                // update name in database
                exists.name = name;
                await guild.updateSettings();
                return "counter:UPDATED";
            }
        }

        const stats = await fetchMemberStats(guild);
        if (type === "USERS") channelName += ` : ${stats[0]}`;
        else if (type === "MEMBERS") channelName += ` : ${stats[2]}`;
        else if (type === "BOTS") channelName += ` : ${stats[1]}`;

        const vc = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ["Connect"],
                },
                {
                    id: guild.members.me.id,
                    allow: ["ViewChannel", "ManageChannels", "Connect"],
                },
            ],
        });

        settings.counters.push({
            counter_type: type,
            channel_id: vc.id,
            name,
        });

        settings.bots = stats[1];
        await guild.updateSettings();

        return "counter:CREATED";
    } catch (err) {
        guild.client.logger.error("setupCounter", err);
        return "counter:FAILED";
    }
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} type
 * @param {object} settings
 */
async function removeCounter(guild, type, settings) {
    try {
        const exists = settings.counters.find((v) => v.counter_type.toUpperCase() === type);
        if (!exists) return "counter:NOT_EXISTS";

        const vc = guild.channels.cache.get(exists.channel_id);
        if (vc) await vc.delete();

        settings.counters = settings.counters.filter((v) => v.counter_type.toUpperCase() !== type);
        await guild.updateSettings();
        return "counter:REMOVED";
    } catch (err) {
        guild.client.logger.error("removeCounter", err);
        return "counter:FAILED";
    }
}

module.exports = {
    counterUpdateQueue,
    fetchMemberStats,
    init,
    updateCounterChannels,
    setupCounter,
    removeCounter,
};
