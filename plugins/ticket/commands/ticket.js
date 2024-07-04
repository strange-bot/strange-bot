const {
    ActionRowBuilder,
    ButtonBuilder,
    ModalBuilder,
    TextInputBuilder,
    ApplicationCommandOptionType,
    ChannelType,
    ButtonStyle,
    TextInputStyle,
    ComponentType,
} = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { isTicketChannel, closeTicket, closeAllTickets } = require("../utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "ticket",
    description: "ticket:TICKET.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "setup <#channel>",
                description: "ticket:TICKET.SUB_SETUP_DESC",
            },
            {
                trigger: "log <#channel>",
                description: "ticket:TICKET.SUB_LOG_DESC",
            },
            {
                trigger: "limit <number>",
                description: "ticket:TICKET.SUB_LIMIT_DESC",
            },
            {
                trigger: "close",
                description: "ticket:TICKET.SUB_CLOSE_DESC",
            },
            {
                trigger: "closeall",
                description: "ticket:TICKET.SUB_CLOSEALL_DESC",
            },
            {
                trigger: "add <userId|roleId>",
                description: "ticket:TICKET.SUB_ADD_DESC",
            },
            {
                trigger: "remove <userId|roleId>",
                description: "ticket:TICKET.SUB_REMOVE_USER",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "setup",
                description: "ticket:TICKET.SUB_SETUP_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel",
                        description: "ticket:TICKET.SUB_SETUP_CHANNEL",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                        required: true,
                    },
                ],
            },
            {
                name: "log",
                description: "ticket:TICKET.SUB_LOG_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel",
                        description: "ticket:TICKET.SUB_LOG_CHANNEL",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                        required: true,
                    },
                ],
            },
            {
                name: "limit",
                description: "ticket:TICKET.SUB_LIMIT_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "amount",
                        description: "max number of tickets",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "close",
                description: "ticket:TICKET.SUB_CLOSE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "closeall",
                description: "ticket:TICKET.SUB_CLOSEALL_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "add",
                description: "ticket:TICKET.SUB_ADD_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user_id",
                        description: "ticket:TICKET.SUB_ADD_USER",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "remove",
                description: "ticket:TICKET.SUB_REMOVE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "ticket:TICKET.SUB_REMOVE_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const input = args[0].toLowerCase();
        const guild = message.guild;
        const settings = guild.getSettings("ticket");
        let response;

        // Setup
        if (input === "setup") {
            if (!message.guild.members.me.permissions.has("ManageChannels")) {
                return message.replyT("ticket:TICKET.SETUP_PERMS");
            }
            const targetChannel = message.guild.findMatchingChannels(args[1])[0];
            if (!targetChannel) {
                return message.safeReply("I could not find channel with that name");
            }
            const sentMsg = await message.channel.send("Please wait ...");
            return ticketModalSetup(sentMsg, message.member, targetChannel);
        }

        // log ticket
        else if (input === "log") {
            if (args.length < 2)
                return message.safeReply("Please provide a channel where ticket logs must be sent");
            const target = message.guild.findMatchingChannels(args[1]);
            if (target.length === 0)
                return message.replyT("common:NO_MATCH_CHANNEL", { query: args[1] });
            response = await setupLogChannel(guild, target[0], settings);
        }

        // Set limit
        else if (input === "limit") {
            if (args.length < 2) return message.safeReply("Please provide a number");
            const limit = args[1];
            if (isNaN(limit)) return message.safeReply("Please provide a number input");
            response = await setupLimit(guild, limit, settings);
        }

        // Close ticket
        else if (input === "close") {
            response = await close(message, message.author);
            if (!response) return;
        }

        // Close all tickets
        else if (input === "closeall") {
            let sent = await message.safeReply("Closing tickets ...");
            response = await closeAll(message, message.author);
            return sent.editable ? sent.edit(response) : message.channel.send(response);
        }

        // Add user to ticket
        else if (input === "add") {
            if (args.length < 2)
                return message.safeReply("Please provide a user or role to add to the ticket");
            let inputId;
            if (message.mentions.users.size > 0) inputId = message.mentions.users.first().id;
            else if (message.mentions.roles.size > 0) inputId = message.mentions.roles.first().id;
            else inputId = args[1];
            response = await addToTicket(message, inputId);
        }

        // Remove user from ticket
        else if (input === "remove") {
            if (args.length < 2)
                return message.safeReply("Please provide a user or role to remove");
            let inputId;
            if (message.mentions.users.size > 0) inputId = message.mentions.users.first().id;
            else if (message.mentions.roles.size > 0) inputId = message.mentions.roles.first().id;
            else inputId = args[1];
            response = await removeFromTicket(message, inputId);
        }

        // Invalid input
        else {
            return message.safeReply("Incorrect command usage");
        }

        if (response) await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const settings = guild.getSettings("ticket");
        let response;

        // setup
        if (sub === "setup") {
            const channel = interaction.options.getChannel("channel");
            if (!interaction.guild.members.me.permissions.has("ManageChannels")) {
                return interaction.followUpT("ticket:TICKET.SETUP_PERMS");
            }

            const sentMsg = await interaction.followUp("Please wait ...");
            return ticketModalSetup(sentMsg, interaction.member, channel);
        }

        // Log channel
        else if (sub === "log") {
            const channel = interaction.options.getChannel("channel");
            response = await setupLogChannel(guild, channel, settings);
        }

        // Limit
        else if (sub === "limit") {
            const limit = interaction.options.getInteger("amount");
            response = await setupLimit(limit, settings);
        }

        // Close
        else if (sub === "close") {
            response = await close(interaction, interaction.user);
        }

        // Close all
        else if (sub === "closeall") {
            response = await closeAll(interaction, interaction.user);
        }

        // Add to ticket
        else if (sub === "add") {
            const inputId = interaction.options.getString("user_id");
            response = await addToTicket(interaction, inputId);
        }

        // Remove from ticket
        else if (sub === "remove") {
            const user = interaction.options.getUser("user");
            response = await removeFromTicket(interaction, user.id);
        }

        if (response) await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').Message} oriMsg
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').GuildTextBasedChannel} targetChannel
 */
async function ticketModalSetup(oriMsg, member, targetChannel) {
    const { guild, channel } = oriMsg;

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("ticket_btnSetup")
            .setLabel(guild.getT("ticket:TICKET.SETUP_BTN"))
            .setStyle(ButtonStyle.Primary),
    );

    const sentMsg = await oriMsg.edit({
        content: guild.getT("ticket:TICKET.SETUP_MSG_CONTENT"),
        components: [buttonRow],
    });

    if (!sentMsg) return;

    const btnInteraction = await channel
        .awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i) =>
                i.customId === "ticket_btnSetup" &&
                i.member.id === member.id &&
                i.message.id === sentMsg.id,
            time: 20000,
        })
        .catch((ex) => {});

    if (!btnInteraction)
        return sentMsg.edit({ content: guild.getT("ticket:TICKET.SETUP_TIMEOUT"), components: [] });

    // display modal
    await btnInteraction.showModal(
        new ModalBuilder({
            customId: "ticket-modalSetup",
            title: guild.getT("ticket:TICKET.SETUP_MODAL_TITLE"),
            components: [
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("title")
                        .setLabel(guild.getT("ticket:TICKET.SETUP_MODAL_LABEL_TITLE"))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("description")
                        .setLabel(guild.getT("ticket:TICKET.SETUP_MODAL_LABEL_DESC"))
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("footer")
                        .setLabel(guild.getT("ticket:TICKET.SETUP_MODAL_LABEL_FOOTER"))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                ),
            ],
        }),
    );

    // receive modal input
    const modal = await btnInteraction
        .awaitModalSubmit({
            time: 1 * 60 * 1000,
            filter: (m) =>
                m.customId === "ticket-modalSetup" &&
                m.member.id === member.id &&
                m.message.id === sentMsg.id,
        })
        .catch((ex) => {});

    if (!modal)
        return sentMsg.edit({ content: guild.getT("ticket:TICKET.SETUP_TIMEOUT"), components: [] });

    await modal.deferReply();
    const title =
        modal.fields.getTextInputValue("title") || guild.getT("ticket:TICKET.SETUP_EMBED_TITLE");
    const description =
        modal.fields.getTextInputValue("description") ||
        guild.getT("ticket:TICKET.SETUP_EMBED_DESC");
    const footer =
        modal.fields.getTextInputValue("footer") || guild.getT("ticket:TICKET.SETUP_EMBED_FOOTER");

    // send ticket message
    const embed = EmbedUtils.embed()
        .setAuthor({ name: title })
        .setDescription(description)
        .setFooter({ text: footer });

    const tktBtnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(guild.getT("ticket:TICKET.SETUP_EMBED_BTN"))
            .setCustomId("ticket:CREATE")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Success),
    );

    await targetChannel.send({ embeds: [embed], components: [tktBtnRow] });
    await modal.deleteReply();
    await sentMsg.edit({ content: guild.getT("ticket:TICKET.SETUP_DONE"), components: [] });
}

async function setupLogChannel(guild, target, settings) {
    if (!target.canSendEmbeds()) {
        return guild.getT("ticket:TICKET.LOG_CHANNEL_PERMS", {
            channel: target.toString(),
        });
    }

    settings.log_channel = target.id;
    await guild.updateSettings();

    return guild.getT("ticket:TICKET.LOG_CHANNEL_SUCCESS", {
        channel: target.toString(),
    });
}

async function setupLimit(guild, limit, settings) {
    if (Number.parseInt(limit, 10) < 5) return guild.getT("ticket:TICKET.LIMIT_TOO_LOW");

    settings.limit = limit;
    await guild.updateSettings();

    return guild.getT("ticket:TICKET.LIMIT_SUCCESS", {
        limit,
    });
}

async function close({ guild, channel }, author) {
    if (!isTicketChannel(channel)) return guild.getT("ticket:TICKET.NOT_TICKET_CHANNEL");
    const status = await closeTicket(channel, author, guild.getT("ticket:TICKET.CLOSE_REASON"));
    if (status === "MISSING_PERMISSIONS") return guild.getT("ticket:TICKET.CLOSE_PERMS");
    if (status === "ERROR") return guild.getT("ticket:TICKET.CLOSE_ERROR");
    return null;
}

async function closeAll({ guild }, user) {
    const stats = await closeAllTickets(guild, user);
    return guild.getT("ticket:TICKET.CLOSE_ALL", {
        success: stats[0],
        failed: stats[1],
    });
}

async function addToTicket({ guild, channel }, inputId) {
    if (!isTicketChannel(channel)) return guild.getT("ticket:TICKET.NOT_TICKET_CHANNEL");
    if (!inputId || isNaN(inputId)) return "Oops! You need to input a valid userId/roleId";

    try {
        await channel.permissionOverwrites.create(inputId, {
            ViewChannel: true,
            SendMessages: true,
        });

        return guild.getT("ticket:TICKET.DONE");
    } catch (ex) {
        return guild.getT("ticket:TICKET.ADD_ERROR");
    }
}

async function removeFromTicket({ guild, channel }, inputId) {
    if (!isTicketChannel(channel)) return guild.getT("ticket:TICKET.NOT_TICKET_CHANNEL");
    if (!inputId || isNaN(inputId)) return guild.getT("ticket:TICKET.INVALID_ID");

    try {
        channel.permissionOverwrites.create(inputId, {
            ViewChannel: false,
            SendMessages: false,
        });
        return guild.getT("ticket:TICKET.DONE");
    } catch (ex) {
        return guild.getT("ticket:TICKET.REMOVE_ERROR");
    }
}
