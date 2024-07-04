const { counterUpdateQueue } = require("../handler.js");

/**
 * @param {import('discord.js').GuildMember|import('discord.js').PartialGuildMember} member
 */
module.exports = async (member) => {
    const settings = member.guild.getSettings("counter");
    if (member.partial) await member.user.fetch();
    if (!member.guild) return;

    // Check for counter channel
    if (
        settings.counters.find((doc) =>
            ["MEMBERS", "BOTS", "USERS"].includes(doc.counter_type.toUpperCase()),
        )
    ) {
        if (member.user.bot) {
            settings.bots -= 1;
            await member.guild.updateSettings();
        }
        if (!counterUpdateQueue.includes(member.guild.id)) counterUpdateQueue.push(member.guild.id);
    }
};
