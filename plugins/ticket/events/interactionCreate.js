const {
    getExistingTicketChannel,
    getTicketChannels,
    closeTicket,
    parse,
    genTicketId,
} = require("../utils");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
    ChannelType,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { addTicketLog } = require("../schemas/TicketLogs");

const OPEN_PERMS = ["ManageChannels"];

/**
 * @param {import('discord.js').BaseInteraction} interaction
 */
module.exports = async (interaction) => {
    if (!interaction.inGuild() || !interaction.isButton()) return;
    const settings = interaction.guild.getSettings("ticket");
    if (!settings.enabled) return;

    //  Ticket Open Button
    if (interaction.customId === "ticket:CREATE") {
        await interaction.deferReply({ ephemeral: true });
        const { guild, user, member } = interaction;

        if (!guild.members.me.permissions.has(OPEN_PERMS))
            return interaction.followUpT("ticket:HANDLER.OPEN_PERMS");

        const alreadyExists = getExistingTicketChannel(guild, user.id);
        if (alreadyExists) return interaction.followUpT("ticket:HANDLER.ALREADY_OPEN");

        // limit check
        const existing = getTicketChannels(guild).size;
        if (existing > settings.limit) return interaction.followUpT("ticket:HANDLER.TOO_MANY");

        let defaultMsg = {
            title: guild.getT("ticket:HANDLER.OPEN_EMBED_TITLE"),
            description: guild.getT("ticket:HANDLER.OPEN_EMBED_DESC"),
            footer: guild.getT("ticket:HANDLER.OPEN_EMBED_FOOTER"),
        };

        let useDefault = true;
        let category = {
            name: "Default",
            description: "Default ticket category",
            parent_id: "auto",
            channel_style: "NUMBER",
            staff_roles: [],
            member_roles: [],
            open_msg: Object.assign({}, defaultMsg),
        };

        const categories = settings.categories;
        if (categories.length > 0) {
            const options = [];
            settings.categories.forEach((cat) =>
                options.push({ label: cat.name, value: cat.name, description: cat.description }),
            );
            const menuRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("ticket-menu")
                    .setPlaceholder(guild.getT("ticket:HANDLER.OPEN_MENU_REPLY"))
                    .addOptions(options),
            );

            await interaction.followUp({
                content: guild.getT("ticket:HANDLER.OPEN_MENU_PLACEHOLDER"),
                components: [menuRow],
            });

            const res = await interaction.channel
                .awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 60 * 1000,
                })
                .catch((err) => {
                    if (err.message.includes("time")) return;
                });

            if (!res)
                return interaction.editReply({
                    content: guild.getT("ticket:HANDLER.OPEN_MENU_TIMEOUT"),
                    components: [],
                });
            await interaction.editReply({
                content: guild.getT("ticket:HANDLER.OPEN_MENU_PROCESS"),
                components: [],
            });

            useDefault = false;
            category = categories.find((cat) => cat.name === res.values[0])?._doc;
            if (
                !category.open_msg?.title &&
                !category.open_msg?.description &&
                !category.open_msg?.footer
            ) {
                category.open_msg = Object.assign({}, defaultMsg);
            }
        }

        try {
            const ticketNumber = (existing + 1).toString();
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone,
                    deny: ["ViewChannel"],
                },
                {
                    id: user.id,
                    allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                },
                {
                    id: guild.members.me.roles.highest.id,
                    allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                },
            ];

            category.staff_roles?.forEach((roleId) => {
                const role = guild.roles.cache.get(roleId);
                if (!role) return;
                permissionOverwrites.push({
                    id: role,
                    allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageChannels"],
                });
            });

            category.member_roles?.forEach((roleId) => {
                const role = guild.roles.cache.get(roleId);
                if (!role) return;
                permissionOverwrites.push({
                    id: role,
                    allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                });
            });

            // create category
            let parentId = category.parent_id;
            if (parentId === "auto") {
                const parent = guild.channels.cache.find(
                    (c) =>
                        c.type === ChannelType.GuildCategory &&
                        c.name === `tіckets-${category.name}`,
                );
                if (!parent) {
                    const created = await guild.channels.create({
                        name: `tіckets-${category.name}`,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            {
                                id: guild.roles.everyone,
                                deny: ["ViewChannel"],
                            },
                        ],
                    });
                    parentId = created.id;
                } else {
                    parentId = parent.id;
                }
            }

            // generate ticket id
            const ticketId = genTicketId();

            // channel name style
            let channelName = "";
            switch (category.channel_style) {
                case "NUMBER":
                    channelName = ticketNumber;
                    break;
                case "NAME":
                    channelName = user.username;
                    break;
                case "ID":
                    channelName = user.id;
                    break;
            }

            const tktChannel = await guild.channels.create({
                name: `tіcket-${channelName}`,
                type: ChannelType.GuildText,
                topic: ticketId + " | " + user.toString(),
                parent: parentId ? guild.channels.cache.get(parentId) : null,
                permissionOverwrites,
            });

            const openEmbed = new EmbedBuilder();

            const parseData = {
                "server": guild.name,
                "count": guild.memberCount,
                "member:name": member.displayName,
                "member:tag": member.user.username,
                "member:mention": member.toString(),
                "ticket:category": category.name,
                "ticket:number": ticketNumber,
                "ticket:id": ticketId,
            };

            if (category.open_msg.title) {
                openEmbed.setAuthor({
                    name: parse(category.open_msg.title, parseData),
                });
            }

            if (category.open_msg.description) {
                openEmbed.setDescription(parse(category.open_msg.description, parseData));
            }

            if (category.open_msg.footer) {
                openEmbed.setFooter({
                    text: parse(category.open_msg.footer, parseData),
                });
            }

            // Default style
            if (useDefault) {
                openEmbed.addFields(
                    {
                        name: guild.getT("ticket:HANDLER.CATEGORY_LABEL"),
                        value: category.name,
                        inline: true,
                    },
                    {
                        name: guild.getT("ticket:HANDLER.TICKET_ID"),
                        value: ticketId,
                        inline: true,
                    },
                );
            }

            let closeBtnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(guild.getT("ticket:HANDLER.OPEN_CLOSE_BTN"))
                    .setCustomId("ticket:CLOSE")
                    .setEmoji("🔒")
                    .setStyle(ButtonStyle.Primary),
            );

            await tktChannel.send({
                content: user.toString(),
                embeds: [openEmbed],
                components: [closeBtnRow],
            });

            const commonFields = [
                {
                    name: guild.getT("ticket:HANDLER.CATEGORY_LABEL"),
                    value: category.name,
                    inline: true,
                },
                {
                    name: guild.getT("ticket:HANDLER.TICKET_ID"),
                    value: ticketId,
                    inline: true,
                },
            ];

            const chBtnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(guild.getT("ticket:HANDLER.OPEN_LOG_BTN"))
                    .setURL(tktChannel.url)
                    .setStyle(ButtonStyle.Link),
            );

            // Log Channel
            if (settings.log_channel) {
                const logChannel = guild.channels.cache.get(settings.log_channel);
                if (logChannel) {
                    const logFields = [
                        {
                            name: guild.getT("ticket:HANDLER.OWNER_LABEL"),
                            value: user.toString() + ` [\`${user.id}\`]`,
                            inline: false,
                        },
                        ...commonFields,
                    ];
                    const logEmbed = new EmbedBuilder()
                        .setColor(settings.embed_colors.create)
                        .setAuthor({ name: guild.getT("ticket:HANDLER.OPEN_LOG_TITLE") })
                        .setFields(logFields);

                    logChannel
                        .send({ embeds: [logEmbed], components: [chBtnRow] })
                        .catch((ex) => {});
                }
            }

            // DM the user
            if (user) {
                const dmFields = [
                    {
                        name: guild.getT("ticket:HANDLER.SERVER_LABEL"),
                        value: guild.name,
                        inline: true,
                    },
                    ...commonFields,
                ];
                const dmEmbed = new EmbedBuilder()
                    .setColor(settings.embed_colors.create)
                    .setAuthor({ name: guild.getT("ticket:HANDLER.OPEN_LOG_TITLE") })
                    .setThumbnail(guild.iconURL())
                    .setFields(dmFields);

                user.send({ embeds: [dmEmbed], components: [chBtnRow] }).catch((ex) => {});
            }

            await addTicketLog({
                ticket_id: ticketId,
                guild_id: guild.id,
                channel_id: tktChannel.id,
                category: category.name,
                opened_by: user.id,
            });

            await interaction.editReply(guild.getT("ticket:HANDLER.OPEN_SUCCESS"));
        } catch (ex) {
            interaction.client.logger.error("handleTicketOpen", ex);
            return interaction.editReply(guild.getT("ticket:HANDLER.OPEN_FAILED"));
        }
    }

    //  Ticket Close Button
    else if (interaction.customId === "ticket:CLOSE") {
        await interaction.deferReply({ ephemeral: true });
        const status = await closeTicket(interaction.channel, interaction.user);
        if (status === "MISSING_PERMISSIONS") {
            return interaction.followUpT("ticket:HANDLER.CLOSE_PERMS");
        } else if (status == "ERROR") {
            return interaction.followUpT("ticket:HANDLER.CLOSE_FAIL");
        }
    }
};
