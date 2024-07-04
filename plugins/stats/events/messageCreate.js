const { getMemberStats } = require("../schemas/MemberStats");
const { MiscUtils } = require("strange-sdk/utils");
const MessageLogs = require("../schemas/MessageLogs");

const cooldownCache = new Map();

const xpToAdd = () => MiscUtils.getRandomInt(19) + 1;

/**
 * @param {string} content
 * @param {import('discord.js').GuildMember} member
 * @param {number} level
 */
const parse = (content, member, level) => {
    return content
        .replaceAll(/\\n/g, "\n")
        .replaceAll(/{server}/g, member.guild.name)
        .replaceAll(/{count}/g, member.guild.memberCount)
        .replaceAll(/{member:id}/g, member.id)
        .replaceAll(/{member:name}/g, member.displayName)
        .replaceAll(/{member:mention}/g, member.toString())
        .replaceAll(/{member:tag}/g, member.user.tag)
        .replaceAll(/{level}/g, level);
};

/**
 * This function saves stats for a new message
 * @param {import("discord.js").Message} message
 */
module.exports = async (message) => {
    if (message.author.bot || message.system || message.webhookId) return;
    const settings = message.guild.getSettings("stats");

    if (!settings.enabled) return;

    // Log to DB
    const data = {
        guild_id: message.guildId,
        channel_id: message.channelId,
        member_id: message.member.id,
        is_cmd: message.isCommand || false,
        is_ccmd: false, // TODO: Add custom commands
        attachments: message.attachments.size,
        embeds: message.embeds.length,
    };

    if (message.isCommand) data.cmd_name = message.commandName;
    MessageLogs.create(data);

    const statsDb = await getMemberStats(message.guildId, message.member.id);
    if (message.isCommand) statsDb.commands.prefix++;
    statsDb.messages++;

    // TODO: Ignore possible bot commands

    // Cooldown check to prevent Message Spamming
    const key = `${message.guildId}|${message.member.id}`;
    if (cooldownCache.has(key)) {
        const difference = (Date.now() - cooldownCache.get(key)) * 0.001;
        if (difference < settings.xp.cooldown) {
            return statsDb.save();
        }
        cooldownCache.delete(key);
    }

    // Update member's XP in DB
    statsDb.xp += xpToAdd();

    // Check if member has levelled up
    let { xp, level } = statsDb;
    const needed = level * level * 100;

    if (xp > needed) {
        level += 1;
        xp -= needed;

        statsDb.xp = xp;
        statsDb.level = level;
        let lvlUpMessage = settings.xp.message;
        lvlUpMessage = parse(lvlUpMessage, message.member, level);

        const xpChannel =
            settings.xp.channel && message.guild.channels.cache.get(settings.xp.channel);
        const lvlUpChannel = xpChannel || message.channel;

        lvlUpChannel.safeSend(lvlUpMessage);
    }
    await statsDb.save();
    cooldownCache.set(key, Date.now());
};
