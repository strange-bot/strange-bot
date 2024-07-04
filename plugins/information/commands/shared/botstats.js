const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { MiscUtils, EmbedUtils, Logger } = require("strange-sdk/utils");
const os = require("os");
const { stripIndent } = require("common-tags");

let coreConfig = null;
try {
    coreConfig = require("../../../core/config");
} catch (ex) {
    Logger.warn("Missing core config?");
}

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
module.exports = ({ client, guild }) => {
    // STATS
    const guilds = client.guilds.cache.size;
    const channels = client.channels.cache.size;
    const users = client.guilds.cache.reduce((size, g) => size + g.memberCount, 0);

    // CPU
    const platform = process.platform.replace(/win32/g, "Windows");
    const architecture = os.arch();
    const cores = 1;
    const cpuUsage = `${((process.cpuUsage().system + process.cpuUsage().user) / 1000000).toFixed(2)}%`;

    // RAM
    const botUsed = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
    const botAvailable =
        `${process.env.SERVER_MEMORY} MB` ||
        `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`;
    const botUsage = `${((parseInt(botUsed) / parseInt(botAvailable)) * 100).toFixed(2)}%`;

    let desc = "";
    desc += `❒ ${guild.getT("information:BOT.STATS_GUILD_COUNT", { count: guilds })}\n`;
    desc += `❒ ${guild.getT("information:BOT.STATS_USER_COUNT", { count: users })}\n`;
    desc += `❒ ${guild.getT("information:BOT.STATS_CHANNEL_COUNT", { count: channels })}\n`;
    desc += `❒ ${guild.getT("information:BOT.STATS_PING", { ping: client.ws.ping })}\n`;
    desc += "\n";

    const embed = EmbedUtils.embed()
        .setTitle(guild.getT("information:BOT.STATS_EMBED_TITLE"))
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(desc)
        .addFields(
            {
                name: guild.getT("information:BOT.STATS_CPU_INFO"),
                value: stripIndent`
                ❯ **${guild.getT("information:BOT.STATS_CPU_PLATFORM")}:** ${platform} [${architecture}]
                ❯ **${guild.getT("information:BOT.STATS_CPU_CORES")}:** ${cores}
                ❯ **${guild.getT("information:BOT.STATS_CPU_USAGE")}:** ${cpuUsage}
                `,
                inline: true,
            },
            {
                name: guild.getT("information:BOT.STATS_BOT_RAM"),
                value: stripIndent`
        ❯ **${guild.getT("information:BOT.STATS_RAM_USED")}:** ${botUsed}
        ❯ **${guild.getT("information:BOT.STATS_RAM_FREE")}:** ${botAvailable}
        ❯ **${guild.getT("information:BOT.STATS_RAM_TOTAL")}:** ${botUsage}
        `,
                inline: true,
            },
            {
                name: guild.getT("information:BOT.STATS_NODE_VERSION"),
                value: process.versions.node,
                inline: false,
            },
            {
                name: guild.getT("information:BOT.STATS_UPTIME"),
                value: "```" + MiscUtils.timeformat(process.uptime()) + "```",
                inline: false,
            },
        );

    // Buttons
    let components = [];
    components.push(
        new ButtonBuilder()
            .setLabel(guild.getT("information:BOT.STATS_BTN_INVITE"))
            .setURL(client.getInvite())
            .setStyle(ButtonStyle.Link),
    );

    if (coreConfig.get("SUPPORT_SERVER")) {
        components.push(
            new ButtonBuilder()
                .setLabel(guild.getT("information:BOT.STATS_BTN_SUPPORT"))
                .setURL(coreConfig.get("SUPPORT_SERVER"))
                .setStyle(ButtonStyle.Link),
        );
    }

    let buttonsRow = new ActionRowBuilder().addComponents(components);

    return { embeds: [embed], components: [buttonsRow] };
};
