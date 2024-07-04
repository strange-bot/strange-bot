const {
    ChannelType,
    ButtonBuilder,
    ActionRowBuilder,
    ComponentType,
    TextInputStyle,
    TextInputBuilder,
    ModalBuilder,
    ButtonStyle,
    ApplicationCommandOptionType,
} = require("discord.js");
const { MiscUtils } = require("strange-sdk/utils");

// Sub Commands
const start = require("./sub/start");
const pause = require("./sub/pause");
const resume = require("./sub/resume");
const end = require("./sub/end");
const reroll = require("./sub/reroll");
const list = require("./sub/list");
const edit = require("./sub/edit");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "giveaway",
    description: "giveaways:DESCRIPTION",
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "start <#channel>",
                description: "giveaways:SUB_START_DESC",
            },
            {
                trigger: "pause <messageId>",
                description: "giveaways:SUB_PAUSE_DESC",
            },
            {
                trigger: "resume <messageId>",
                description: "giveaways:SUB_RESUME_DESC",
            },
            {
                trigger: "end <messageId>",
                description: "giveaways:SUB_END_DESC",
            },
            {
                trigger: "reroll <messageId>",
                description: "giveaways:SUB_REROLL_DESC",
            },
            {
                trigger: "list",
                description: "giveaways:SUB_LIST_DESC",
            },
            {
                trigger: "edit <messageId>",
                description: "giveaways:SUB_EDIT_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "start",
                description: "giveaways:SUB_START_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "channel",
                        description: "giveaways:SUB_START_CHANNEL_DESC",
                        type: ApplicationCommandOptionType.Channel,
                        channelTypes: [ChannelType.GuildText],
                        required: true,
                    },
                    {
                        name: "duration",
                        description: "giveaways:SUB_START_DURATION_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                    {
                        name: "prize",
                        description: "giveaways:SUB_START_PRIZE_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                    {
                        name: "winners",
                        description: "giveaways:SUB_START_WINNERS_DESC",
                        type: ApplicationCommandOptionType.Integer,
                        required: false,
                    },
                    {
                        name: "roles",
                        description: "giveaways:SUB_START_ROLES_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                    {
                        name: "host",
                        description: "giveaways:SUB_START_HOST_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "pause",
                description: "giveaways:SUB_PAUSE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "giveaways:SUB_PAUSE_MESSAGE_ID_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "resume",
                description: "giveaways:SUB_RESUME_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "giveaways:SUB_RESUME_MESSAGE_ID_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "end",
                description: "giveaways:SUB_END_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "giveaways:SUB_END_MESSAGE_ID_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "reroll",
                description: "giveaways:SUB_REROLL_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "giveaways:SUB_REROLL_MESSAGE_ID_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "list",
                description: "giveaways:SUB_LIST_DESC",
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "edit",
                description: "giveaways:SUB_EDIT_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message_id",
                        description: "giveaways:SUB_EDIT_MESSAGE_ID_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                    {
                        name: "add_duration",
                        description: "giveaways:SUB_EDIT_MESSAGE_ID_DESC",
                        type: ApplicationCommandOptionType.Integer,
                        required: false,
                    },
                    {
                        name: "new_prize",
                        description: "giveaways:SUB_EDIT_PRIZE_DESC",
                        type: ApplicationCommandOptionType.String,
                        required: false,
                    },
                    {
                        name: "new_winners",
                        description: "giveaways:SUB_EDIT_WINNERS_DESC",
                        type: ApplicationCommandOptionType.Integer,
                        required: false,
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const sub = args[0]?.toLowerCase();
        let response;

        //
        if (sub === "start") {
            if (!args[1]) {
                return message.replyT("giveaways:START_CHANNEL");
            }
            const match = message.guild.findMatchingChannels(args[1]);
            if (!match.length) return message.replyT("common:NO_MATCH_CHANNEL", { query: args[1] });
            return await runModalSetup(message, match[0]);
        }

        //
        else if (sub === "pause") {
            const messageId = args[1];
            response = await pause(message.member, messageId);
        }

        //
        else if (sub === "resume") {
            const messageId = args[1];
            response = await resume(message.member, messageId);
        }

        //
        else if (sub === "end") {
            const messageId = args[1];
            response = await end(message.member, messageId);
        }

        //
        else if (sub === "reroll") {
            const messageId = args[1];
            response = await reroll(message.member, messageId);
        }

        //
        else if (sub === "list") {
            response = await list(message.member);
        }

        //
        else if (sub === "edit") {
            const messageId = args[1];
            if (!messageId) return message.replyT("giveaways:INVALID_MESSAGE_ID");
            return await runModalEdit(message, messageId);
        }

        //
        else response = message.guild.getT("common:INVALID_SUBCOMMAND", { sub });

        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const sub = interaction.options.getSubcommand();
        let response;

        //
        if (sub === "start") {
            response = await start(
                interaction.member,
                interaction.options.getChannel("channel"),
                interaction.options.getString("duration"),
                interaction.options.getString("prize"),
                interaction.options.getInteger("winners"),
                interaction.options.getUser("host")?.id,
                interaction.options.getString("roles"),
            );
        }

        //
        else if (sub === "pause") {
            const messageId = interaction.options.getString("message_id");
            response = await pause(interaction.member, messageId);
        }

        //
        else if (sub === "resume") {
            const messageId = interaction.options.getString("message_id");
            response = await resume(interaction.member, messageId);
        }

        //
        else if (sub === "end") {
            const messageId = interaction.options.getString("message_id");
            response = await end(interaction.member, messageId);
        }

        //
        else if (sub === "reroll") {
            const messageId = interaction.options.getString("message_id");
            response = await reroll(interaction.member, messageId);
        }

        //
        else if (sub === "list") {
            response = await list(interaction.member);
        }

        //
        else if (sub === "edit") {
            response = await edit(
                interaction.member,
                interaction.options.getString("message_id"),
                interaction.options.getInteger("add_duration"),
                interaction.options.getString("new_prize"),
                interaction.options.getInteger("new_winners"),
            );
        }

        //
        else {
            return interaction.followUpT("common:INVALID_SUBCOMMAND", { sub });
        }

        await interaction.followUp(response);
    },
};

// Modal Giveaway setup
/**
 * @param {import('discord.js').Message|import('discord.js').CommandInteraction} args0
 * @param {import('discord.js').GuildTextBasedChannel} targetCh
 */
async function runModalSetup({ member, channel, guild }, targetCh) {
    const SETUP_PERMS = ["ViewChannel", "SendMessages", "EmbedLinks"];

    // validate channel perms
    if (!targetCh) return channel.safeSend(guild.getT("giveaways:START_INVALID_CHANNEL"));
    if (
        !targetCh.type === ChannelType.GuildText &&
        !targetCh.permissionsFor(guild.members.me).has(SETUP_PERMS)
    ) {
        return channel.safeSend(
            guild.getT("giveaways:START_NO_PERMS", {
                permissions: MiscUtils.parsePermissions(SETUP_PERMS),
                channel: targetCh,
            }),
        );
    }

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("giveaway_btnSetup")
            .setLabel(guild.getT("giveaways:START_BTN_LABEL"))
            .setStyle(ButtonStyle.Primary),
    );

    const sentMsg = await channel.safeSend({
        content: guild.getT("giveaways:START_BTN_CONTENT"),
        components: [buttonRow],
    });

    if (!sentMsg) return;

    const btnInteraction = await channel
        .awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i) =>
                i.customId === "giveaway_btnSetup" &&
                i.member.id === member.id &&
                i.message.id === sentMsg.id,
            time: 20000,
        })
        .catch((ex) => {});

    if (!btnInteraction)
        return sentMsg.edit({ content: guild.getT("giveaways:START_NO_RESPONSE"), components: [] });

    // display modal
    await btnInteraction.showModal(
        new ModalBuilder({
            customId: "giveaway-modalSetup",
            title: guild.getT("giveaways:START_MODAL_TITLE"),
            components: [
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("duration")
                        .setLabel(guild.getT("giveaways:START_MODAL_DURATION"))
                        .setPlaceholder("1h / 1d / 1w")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("prize")
                        .setLabel(guild.getT("giveaways:START_MODAL_PRIZE"))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("winners")
                        .setLabel(guild.getT("giveaways:START_MODAL_WINNERS"))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("roles")
                        .setLabel(guild.getT("giveaways:START_MODAL_ROLES"))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("host")
                        .setLabel(guild.getT("giveaways:START_MODAL_HOST"))
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
                m.customId === "giveaway-modalSetup" &&
                m.member.id === member.id &&
                m.message.id === sentMsg.id,
        })
        .catch((ex) => {});

    if (!modal)
        return sentMsg.edit({ content: guild.getT("giveaways:START_NO_RESPONSE"), components: [] });

    sentMsg.delete().catch(() => {});
    await modal.reply(guild.getT("giveaways:START_CREATING"));

    const response = await start(
        member,
        targetCh,
        modal.fields.getTextInputValue("duration"),
        modal.fields.getTextInputValue("prize"),
        parseInt(modal.fields.getTextInputValue("winners")),
        modal.fields.getTextInputValue("host"),
        modal.fields.getTextInputValue("roles"),
    );

    await modal.editReply(response);
}

// Interactive Giveaway Update
/**
 * @param {import('discord.js').Message} message
 * @param {string} messageId
 */
async function runModalEdit(message, messageId) {
    const { member, channel, guild } = message;

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("giveaway_btnEdit")
            .setLabel(guild.getT("giveaways:EDIT_BTN_LABEL"))
            .setStyle(ButtonStyle.Primary),
    );

    const sentMsg = await channel.send({
        content: guild.getT("giveaways:EDIT_BTN_CONTENT"),
        components: [buttonRow],
    });

    const btnInteraction = await channel
        .awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i) =>
                i.customId === "giveaway_btnEdit" &&
                i.member.id === member.id &&
                i.message.id === sentMsg.id,
            time: 20000,
        })
        .catch((ex) => {});

    if (!btnInteraction)
        return sentMsg.edit({ content: guild.getT("giveaways:EDIT_NO_RESPONSE"), components: [] });

    // display modal
    await btnInteraction.showModal(
        new ModalBuilder({
            customId: "giveaway-modalEdit",
            title: guild.getT("giveaways:EDIT_MODAL_TITLE"),
            components: [
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("duration")
                        .setLabel(guild.getT("giveaways:EDIT_MODAL_DURATION"))
                        .setPlaceholder("1h / 1d / 1w")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("prize")
                        .setLabel(guild.getT("giveaways:EDIT_MODAL_PRIZE"))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("winners")
                        .setLabel(guild.getT("giveaways:EDIT_MODAL_WINNERS"))
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
                m.customId === "giveaway-modalEdit" &&
                m.member.id === member.id &&
                m.message.id === sentMsg.id,
        })
        .catch((ex) => {});

    if (!modal)
        return sentMsg.edit({ content: guild.getT("giveaways:EDIT_NO_RESPONSE"), components: [] });

    sentMsg.delete().catch(() => {});
    await modal.reply(guild.getT("giveaways:EDIT_CREATING"));

    const response = await edit(
        message.member,
        messageId,
        modal.fields.getTextInputValue("duration"),
        modal.fields.getTextInputValue("prize"),
        modal.fields.getTextInputValue("winners"),
    );

    await modal.editReply(response);
}
