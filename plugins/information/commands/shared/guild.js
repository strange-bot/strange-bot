const { ChannelType, GuildVerificationLevel } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const moment = require("moment");

/**
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (guild) => {
    const { name, id, preferredLocale, channels, roles, ownerId } = guild;

    const owner = await guild.members.fetch(ownerId);
    const createdAt = moment(guild.createdAt);

    const totalChannels = channels.cache.size;
    const categories = channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const textChannels = channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.cache.filter(
        (c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice,
    ).size;
    const threadChannels = channels.cache.filter(
        (c) => c.type === ChannelType.PrivateThread || c.type === ChannelType.PublicThread,
    ).size;

    const memberCache = guild.members.cache;
    const all = memberCache.size;
    const bots = memberCache.filter((m) => m.user.bot).size;
    const users = all - bots;
    const onlineUsers = memberCache.filter(
        (m) => !m.user.bot && m.presence?.status === "online",
    ).size;
    const onlineBots = memberCache.filter(
        (m) => m.user.bot && m.presence?.status === "online",
    ).size;
    const onlineAll = onlineUsers + onlineBots;
    const rolesCount = roles.cache.size;

    const getMembersInRole = (members, role) => {
        return members.filter((m) => m.roles.cache.has(role.id)).size;
    };

    let rolesString = roles.cache
        .filter((r) => !r.name.includes("everyone"))
        .map((r) => `${r.name}[${getMembersInRole(memberCache, r)}]`)
        .join(", ");

    if (rolesString.length > 1024) rolesString = rolesString.substring(0, 1020) + "...";

    let { verificationLevel } = guild;
    switch (guild.verificationLevel) {
        case GuildVerificationLevel.VeryHigh:
            verificationLevel = "┻�?┻ミヽ(ಠ益ಠ)ノ彡┻�?┻";
            break;

        case GuildVerificationLevel.High:
            verificationLevel = "(╯°□°）╯︵ ┻�?┻";
            break;

        default:
            break;
    }

    let desc = "";
    desc = `${desc + "❯"} **${guild.getT("information:INFO.GUILD_ID")}:** ${id}\n`;
    desc = `${desc + "❯"} **${guild.getT("information:INFO.GUILD_NAME")}:** ${name}\n`;
    desc = `${desc + "❯"} **${guild.getT("information:INFO.GUILD_OWNER")}:** ${owner.user.username}\n`;
    desc = `${desc + "❯"} **${guild.getT("information:INFO.GUILD_REGION")}:** ${preferredLocale}\n`;
    desc += "\n";

    const embed = EmbedUtils.embed()
        .setTitle(guild.getT("information:INFO.GUILD_EMBED_TITLE"))
        .setThumbnail(guild.iconURL())
        .setDescription(desc)
        .addFields(
            {
                name: `${guild.getT("information:INFO.GUILD_MEMBERS")} [${all}]`,
                value: `\`\`\`${guild.getT("information:INFO.GUILD_MEMBERS_VAL", { users, bots })}\`\`\``,
                inline: true,
            },
            {
                name: `${guild.getT("information:INFO.GUILD_ONLINE")} [${onlineAll}]`,
                value: `\`\`\`${guild.getT("information:INFO.GUILD_ONLINE_VAL", { onlineUsers, onlineBots })}\`\`\``,
                inline: true,
            },
            {
                name: `${guild.getT("information:INFO.GUILD_CHANNELS")} [${totalChannels}]`,
                value: `\`\`\`${guild.getT("information:INFO.GUILD_CHANNELS_VAL", {
                    categories,
                    textChannels,
                    voiceChannels,
                    threadChannels,
                })}\`\`\``,
                inline: false,
            },
            {
                name: `${guild.getT("information:INFO.GUILD_ROLES")} [${rolesCount}]`,
                value: `\`\`\`${rolesString}\`\`\``,
                inline: false,
            },
            {
                name: guild.getT("information:INFO.GUILD_VERIFICATION"),
                value: `\`\`\`${verificationLevel}\`\`\``,
                inline: true,
            },
            {
                name: guild.getT("information:INFO.GUILD_BOOSTS"),
                value: `\`\`\`${guild.premiumSubscriptionCount}\`\`\``,
                inline: true,
            },
            {
                name: `${guild.getT("information:INFO.GUILD_CREATED")} [${createdAt.fromNow()}]`,
                value: `\`\`\`${createdAt.format("dddd, Do MMMM YYYY")}\`\`\``,
                inline: false,
            },
        );

    if (guild.splashURL()) embed.setImage(guild.splashURL({ extension: "png", size: 256 }));

    return { embeds: [embed] };
};
