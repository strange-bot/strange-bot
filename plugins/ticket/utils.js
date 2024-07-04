const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
} = require("discord.js");
const { Logger } = require("strange-sdk/utils");
const { closeTicketLog } = require("./schemas/TicketLogs");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 8 });

const CLOSE_PERMS = ["ManageChannels", "ReadMessageHistory"];

const genTicketId = () => uid.rnd();

/**
 * @param {string} content
 * @param {Object} data
 */
const parse = (content, data) => {
    for (const key in data) {
        content = content.replace(new RegExp(`{${key}}`, "g"), data[key]);
    }
    return content;
};

/**
 * @param {import('discord.js').Channel} channel
 */
function isTicketChannel(channel) {
    return (
        channel.type === ChannelType.GuildText &&
        channel.name.startsWith("tіcket-") &&
        channel.topic &&
        channel.topic.includes(" | ")
    );
}

/**
 * @param {import('discord.js').Guild} guild
 */
function getTicketChannels(guild) {
    return guild.channels.cache.filter((ch) => isTicketChannel(ch));
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 */
function getExistingTicketChannel(guild, userId) {
    const tktChannels = getTicketChannels(guild);
    return tktChannels.filter((ch) => ch.topic.split("|")[1] === userId).first();
}

/**
 * @param {import('discord.js').BaseGuildTextChannel} channel
 */
async function parseTicketDetails(channel) {
    if (!channel.topic) return;
    const split = channel.topic?.split(" | ");
    const ticketId = split[0];
    const userId = split[1].match(/\d+/)[0];
    const user = await channel.client.users.fetch(userId, { cache: false }).catch(() => {});
    return { ticketId, user };
}

/**
 * @param {import('discord.js').BaseGuildTextChannel} channel
 * @param {import('discord.js').User} closedBy
 * @param {string} [reason]
 */
async function closeTicket(channel, closedBy, reason) {
    if (!channel.deletable || !channel.permissionsFor(channel.guild.members.me).has(CLOSE_PERMS)) {
        return "MISSING_PERMISSIONS";
    }

    const guild = channel.guild;

    try {
        const settings = guild.getSettings("ticket");
        const messages = await channel.messages.fetch();

        const transcript = Array.from(messages.values())
            .reverse()
            .map((m) => ({
                author: m.author.username,
                content: m.cleanContent,
                embeds: m.embeds.map((e) => e.toJSON()),
                timestamp: m.createdAt,
                bot: m.author.bot,
                attachments: m.attachments.map((att) => ({
                    name: att.name,
                    description: att.description,
                    url: att.proxyURL,
                })),
            }));

        const ticketDetails = await parseTicketDetails(channel);

        const ticketLog = await closeTicketLog(
            guild.id,
            channel.id,
            ticketDetails.ticketId,
            closedBy.id,
            reason || "",
            transcript,
        );

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(guild.getT("ticket:HANDLER.CLOSE_LOG_BTN"))
                    .setCustomId(`ticket:TRANSCRIPT-${ticketLog._id}`)
                    .setStyle(ButtonStyle.Secondary),
            ),
        ];

        if (channel.deletable) await channel.delete();

        // send embed to log channel
        if (settings.log_channel) {
            const logChannel = guild.channels.cache.get(settings.log_channel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_TITLE") })
                    .setColor(settings.embed_colors.close)
                    .setFields([
                        {
                            name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_OPENED"),
                            value: ticketDetails.user ? ticketDetails.user.username : "Unknown",
                            inline: true,
                        },
                        {
                            name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_CLOSED"),
                            value: closedBy ? closedBy.username : "Unknown",
                            inline: true,
                        },
                        {
                            name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_REASON"),
                            value: reason || "NA",
                            inline: true,
                        },
                        {
                            name: guild.getT("ticket:HANDLER.CATEGORY_LABEL"),
                            value: ticketLog.category,
                            inline: true,
                        },
                        {
                            name: guild.getT("ticket:HANDLER.TICKET_ID"),
                            value: ticketDetails.ticketId,
                            inline: true,
                        },
                    ]);

                logChannel.safeSend({ embeds: [embed], components });
            }
        }

        // send embed to user
        if (ticketDetails.user) {
            const fields = [
                {
                    name: guild.getT("ticket:HANDLER.SERVER_LABEL"),
                    value: guild.name,
                    inline: false,
                },
                {
                    name: guild.getT("ticket:HANDLER.CATEGORY_LABEL"),
                    value: ticketLog.category,
                    inline: true,
                },
                {
                    name: guild.getT("ticket:HANDLER.TICKET_ID"),
                    value: ticketDetails.ticketId,
                    inline: true,
                },
                {
                    name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_CLOSED"),
                    value: closedBy ? closedBy.username : "Unknown",
                    inline: true,
                },
            ];

            if (reason) {
                fields.push({
                    name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_REASON"),
                    value: reason,
                    inline: false,
                });
            }

            const dmEmbed = new EmbedBuilder()
                .setAuthor({ name: guild.getT("ticket:HANDLER.CLOSE_LOG_EMBED_TITLE") })
                .setColor(settings.embed_colors.close)
                .setFields(fields)
                .setThumbnail(guild.iconURL());

            ticketDetails.user.send({ embeds: [dmEmbed], components }).catch((ex) => {});
        }

        return "SUCCESS";
    } catch (ex) {
        Logger.error("closeTicket", ex);
        return "ERROR";
    }
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} author
 */
async function closeAllTickets(guild, author) {
    const channels = getTicketChannels(guild);
    let success = 0;
    let failed = 0;

    for (const ch of channels) {
        const status = await closeTicket(
            ch[1],
            author,
            guild.getT("ticket:HANDLER.CLOSE_ALL_REASON"),
        );
        if (status === "SUCCESS") success += 1;
        else failed += 1;
    }

    return [success, failed];
}

module.exports = {
    genTicketId,
    parse,
    getTicketChannels,
    getExistingTicketChannel,
    isTicketChannel,
    closeTicket,
    closeAllTickets,
};
