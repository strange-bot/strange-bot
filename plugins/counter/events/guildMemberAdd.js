const { counterUpdateQueue } = require("../handler.js");

/**
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (member) => {
    if (!member || !member.guild) return;
    const settings = member.guild.getSettings("counter");

    // Check for counter channel
    if (
        settings.counters.find((doc) =>
            ["MEMBERS", "BOTS", "USERS"].includes(doc.counter_type.toUpperCase()),
        )
    ) {
        if (member.user.bot) {
            settings.bots += 1;
            await member.guild.updateSettings();
        }
        if (!counterUpdateQueue.includes(member.guild.id)) counterUpdateQueue.push(member.guild.id);
    }
};
