const { ChannelType } = require("discord.js");
const { EmbedUtils, channelTypes } = require("strange-sdk/utils");
const { stripIndent } = require("common-tags");

/**
 * @param {import('discord.js').GuildChannel} channel
 */
module.exports = (channel) => {
    const { id, name, parent, position, type, guild } = channel;

    let desc = stripIndent`
      ❯ ${guild.getT("information:INFO.CHANNEL_ID")}: **${id}**
      ❯ ${guild.getT("information:INFO.CHANNEL_NAME")}: **${name}**
      ❯ ${guild.getT("information:INFO.CHANNEL_TYPE")}: **${channelTypes(channel.type)}**
      ❯ ${guild.getT("information:INFO.CHANNEL_CATEGORY")}: **${parent || "NA"}**\n
      `;

    if (type === ChannelType.GuildText) {
        const { rateLimitPerUser, nsfw } = channel;
        desc += stripIndent`
      ❯ ${guild.getT("information:INFO.CHANNEL_TOPIC")}: **${channel.topic || "No topic set"}**
      ❯ ${guild.getT("information:INFO.CHANNEL_POSITION")}: **${position}**
      ❯ ${guild.getT("information:INFO.CHANNEL_SLOWMODE")}: **${rateLimitPerUser}**
      ❯ ${guild.getT("information:INFO.CHANNEL_NSFW")}: **${nsfw ? "✓" : "✕"}**\n
      `;
    }

    if (type === ChannelType.GuildPublicThread || type === ChannelType.GuildPrivateThread) {
        const { ownerId, archived, locked } = channel;
        desc += stripIndent`
      ❯ ${guild.getT("information:INFO.CHANNEL_OWNER_ID")}: **${ownerId}**
      ❯ ${guild.getT("information:INFO.CHANNEL_ARCHIVED")}: **${archived ? "✓" : "✕"}**
      ❯ ${guild.getT("information:INFO.CHANNEL_LOCKED")}: **${locked ? "✓" : "✕"}**\n
      `;
    }

    if (type === ChannelType.GuildNews || type === ChannelType.GuildNewsThread) {
        const { nsfw } = channel;
        desc += stripIndent`
      ❯ isNSFW: **${nsfw ? "✓" : "✕"}**\n
      `;
    }

    if (type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice) {
        const { bitrate, userLimit, full } = channel;
        desc += stripIndent`
      ❯ ${guild.getT("information:INFO.CHANNEL_POSITION")}: **${position}**
      ❯ ${guild.getT("information:INFO.CHANNEL_BITRATE")}: **${bitrate}**
      ❯ ${guild.getT("information:INFO.CHANNEL_USER_LIMIT")}: **${userLimit}**
      ❯ ${guild.getT("information:INFO.CHANNEL_FULL")}: **${full ? "✓" : "✕"}**\n
      `;
    }

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("information:INFO.CHANNEL_EMBED_TITLE", { channel: name }),
        })
        .setDescription(desc);

    return { embeds: [embed] };
};
