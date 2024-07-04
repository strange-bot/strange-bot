const { handleSlashCommand, handleContext } = require("../handler");

/**
 * @param {import('discord.js').Interaction} interaction
 */
module.exports = async (interaction) => {
    if (!interaction.guild) {
        return interaction
            .reply({ content: "Command can only be executed in a discord server", ephemeral: true })
            .catch(() => {});
    }

    const guild = interaction.guild;

    // Slash Commands
    if (interaction.isChatInputCommand()) {
        const cmd = interaction.client.slashCommands.get(interaction.commandName);
        if (!cmd) {
            return interaction
                .reply({ content: guild.getT("core:HANDLER.CMD_NOT_FOUND"), ephemeral: true })
                .catch(() => {});
        }

        // check if the plugin is disabled
        if (interaction.guild.getSettings(cmd.plugin.name).enabled === false) {
            return interaction
                .reply({ content: guild.getT("core:HANDLER.PLUGIN_DISABLED"), ephemeral: true })
                .catch(() => {});
        }

        // check if the command is disabled
        const settings = interaction.guild.getSettings("core");
        if (settings.disabled_slash.includes(cmd.name)) {
            return interaction
                .reply({ content: guild.getT("core:HANDLER.CMD_DISABLED"), ephemeral: true })
                .catch(() => {});
        }

        await handleSlashCommand(interaction, cmd);
    }

    // Context Menu
    else if (interaction.isContextMenuCommand()) {
        const context = interaction.client.contextMenus.get(interaction.commandName);
        if (context) await handleContext(interaction, context);
        else
            return interaction
                .reply({ content: "An error has occurred", ephemeral: true })
                .catch(() => {});
    }
};
