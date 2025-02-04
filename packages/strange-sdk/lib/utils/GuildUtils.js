const { ChannelType } = require("discord.js");

const ROLE_MENTION = /<?@?&?(\d{17,20})>?/;
const CHANNEL_MENTION = /<?#?(\d{17,20})>?/;
const MEMBER_MENTION = /<?@?!?(\d{17,20})>?/;

/**
 * Utility class for Discord guild-related operations
 */
class GuildUtils {
    /**
     * Checks if the bot can send embeds in the specified channel
     * @param {import('discord.js').Guild} guild - The guild to check permissions in
     * @param {import('discord.js').GuildChannel} channel - The channel to check permissions for
     * @returns {boolean} Whether the bot can send embeds in the channel
     */
    static canSendEmbeds(guild, channel) {
        if (!guild || !channel) return false;
        const permissions = channel.permissionsFor(guild.members.me);
        return permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"]);
    }

    /**
     * Safely send a message to the channel with optional auto-delete
     * @param {import('discord.js').GuildChannel} channel - The channel to send the message to
     * @param {string|import('discord.js').MessagePayload|import('discord.js').MessageReplyOptions} content - The message content to send
     * @param {number} [seconds] - Optional duration after which to delete the message
     * @returns {Promise<import('discord.js').Message|void>} The sent message, if successful
     */
    static async safeSend(channel, content, seconds) {
        if (!content) return;
        if (!channel.type === ChannelType.GuildText && !channel.type === ChannelType.DM) return;

        const perms = ["ViewChannel", "SendMessages"];
        if (content.embeds && content.embeds.length > 0) perms.push("EmbedLinks");
        if (!channel.permissionsFor(channel.guild.members.me).has(perms)) return;

        try {
            if (!seconds) return await channel.send(content);
            const reply = await channel.send(content);
            setTimeout(() => reply.deletable && reply.delete().catch(() => {}), seconds * 1000);
        } catch (ex) {
            channel.client.logger.error(`safeSend`, ex);
        }
    }

    /**
     * Returns a list of matching channels based on query
     * @param {import('discord.js').Guild} guild - The guild to search in
     * @param {string} query - The search query (name/id/mention)
     * @param {import('discord.js').ChannelType[]} [type=[ChannelType.GuildText, ChannelType.GuildAnnouncement]] - Channel types to include
     * @returns {import('discord.js').GuildChannel[]} Array of matching channels
     */
    static findMatchingChannels(guild, query, type = [ChannelType.GuildText, ChannelType.GuildAnnouncement]) {
        if (!guild || !query || typeof query !== "string") return [];

        const channelManager = guild.channels.cache.filter((ch) => type.includes(ch.type));

        const patternMatch = query.match(CHANNEL_MENTION);
        if (patternMatch) {
            const id = patternMatch[1];
            const channel = channelManager.find((r) => r.id === id);
            if (channel) return [channel];
        }

        const exact = [];
        const startsWith = [];
        const includes = [];
        channelManager.forEach((ch) => {
            const lowerName = ch.name.toLowerCase();
            if (ch.name === query) exact.push(ch);
            if (lowerName.startsWith(query.toLowerCase())) startsWith.push(ch);
            if (lowerName.includes(query.toLowerCase())) includes.push(ch);
        });

        if (exact.length > 0) return exact;
        if (startsWith.length > 0) return startsWith;
        if (includes.length > 0) return includes;
        return [];
    }

    /**
     * Returns a list of matching roles based on query
     * @param {import('discord.js').Guild} guild - The guild to search in
     * @param {string} query - The search query (name/id/mention)
     * @returns {import('discord.js').Role[]} Array of matching roles
     */
    static findMatchingRoles(guild, query) {
        if (!guild || !query || typeof query !== "string") return [];

        const patternMatch = query.match(ROLE_MENTION);
        if (patternMatch) {
            const id = patternMatch[1];
            const role = guild.roles.cache.find((r) => r.id === id);
            if (role) return [role];
        }

        const exact = [];
        const startsWith = [];
        const includes = [];
        guild.roles.cache.forEach((role) => {
            const lowerName = role.name.toLowerCase();
            if (role.name === query) exact.push(role);
            if (lowerName.startsWith(query.toLowerCase())) startsWith.push(role);
            if (lowerName.includes(query.toLowerCase())) includes.push(role);
        });
        if (exact.length > 0) return exact;
        if (startsWith.length > 0) return startsWith;
        if (includes.length > 0) return includes;
        return [];
    }

    /**
     * Resolves a guild member from search query
     * @param {import('discord.js').Guild} guild - The guild to search in
     * @param {string} query - The search query (username/id/mention/tag)
     * @param {boolean} [exact=false] - Whether to match the query exactly
     * @returns {Promise<import('discord.js').GuildMember|undefined>} The resolved member, if found
     */
    static async resolveMember(guild, query, exact = false) {
        if (!query || typeof query !== "string") return;

        // Check if mentioned or ID is passed
        const patternMatch = query.match(MEMBER_MENTION);
        if (patternMatch) {
            const id = patternMatch[1];
            const fetched = await guild.members.fetch({ user: id }).catch(() => {});
            if (fetched) return fetched;
        }

        // Fetch and cache members from API
        await guild.members.fetch({ query }).catch(() => {});

        // Check if exact tag is matched
        const matchingTags = guild.members.cache.filter((mem) => mem.user.tag === query);
        if (matchingTags.size === 1) return matchingTags.first();

        // Check for matching username
        if (!exact) {
            return guild.members.cache.find(
                (x) =>
                    x.user.username === query ||
                    x.user.username.toLowerCase().includes(query.toLowerCase()) ||
                    x.displayName.toLowerCase().includes(query.toLowerCase()),
            );
        }
    }
}

module.exports = GuildUtils;
