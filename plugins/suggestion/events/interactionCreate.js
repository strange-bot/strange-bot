const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { approveSuggestion, rejectSuggestion, deleteSuggestion } = require("../utils");

/**
 * @param {import('discord.js').BaseInteraction} interaction
 */
module.exports = async (interaction) => {
    if (!interaction.inGuild()) return;
    const guild = interaction.guild;
    const settings = guild.getSettings("suggestion");
    if (!settings.enabled) return;

    // BUTTONS
    if (interaction.isButton()) {
        // Approve Button
        if (interaction.customId === "suggestion:APPROVE_BTN") {
            await interaction.showModal(
                new ModalBuilder({
                    title: guild.getT("suggestion:HANDLER.APPROVE_MODAL_TITLE"),
                    customId: "suggestion:APPROVE_MODAL",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel(guild.getT("suggestion:HANDLER.MODAL_REASON"))
                                .setStyle(TextInputStyle.Paragraph)
                                .setMinLength(4),
                        ]),
                    ],
                }),
            );
        }

        // Reject Button
        else if (interaction.customId === "suggestion:REJECT_BTN") {
            await interaction.showModal(
                new ModalBuilder({
                    title: guild.getT("suggestion:HANDLER.REJECT_MODAL_TITLE"),
                    customId: "suggestion:REJECT_MODAL",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel(guild.getT("suggestion:HANDLER.MODAL_REASON"))
                                .setStyle(TextInputStyle.Paragraph)
                                .setMinLength(4),
                        ]),
                    ],
                }),
            );
        }

        // Delete Button
        else if (interaction.customId === "suggestion:DELETE_BTN") {
            await interaction.showModal(
                new ModalBuilder({
                    title: guild.getT("suggestion:HANDLER.DELETE_MODAL_TITLE"),
                    customId: "suggestion:DELETE_MODAL",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel(guild.getT("suggestion:HANDLER.MODAL_REASON"))
                                .setStyle(TextInputStyle.Paragraph)
                                .setMinLength(4),
                        ]),
                    ],
                }),
            );
        }
    }

    // MODALS
    else if (interaction.isModalSubmit()) {
        // Approve Modal
        if (interaction.customId === "suggestion:APPROVE_MODAL") {
            await interaction.deferReply({ ephemeral: true });
            const reason = interaction.fields.getTextInputValue("reason");
            const response = await approveSuggestion(
                interaction.member,
                interaction.channel,
                interaction.message.id,
                reason,
            );
            await interaction.followUp(response);
        }

        // Reject Modal
        else if (interaction.customId === "suggestion:REJECT_MODAL") {
            await interaction.deferReply({ ephemeral: true });
            const reason = interaction.fields.getTextInputValue("reason");
            const response = await rejectSuggestion(
                interaction.member,
                interaction.channel,
                interaction.message.id,
                reason,
            );
            await interaction.followUp(response);
        }

        // Delete Modal
        else if (interaction.customId === "suggestion:DELETE_MODAL") {
            await interaction.deferReply({ ephemeral: true });
            const reason = interaction.fields.getTextInputValue("reason");
            const response = await deleteSuggestion(
                interaction.member,
                interaction.channel,
                interaction.message.id,
                reason,
            );
            await interaction.followUp({ content: response, ephemeral: true });
        }
    }
};
