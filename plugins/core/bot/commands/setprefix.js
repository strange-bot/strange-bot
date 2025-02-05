const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "setprefix",
    description: "core:PREFIX.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<new-prefix>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "newprefix",
                description: "core:PREFIX.NEW_PREFIX",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun({ message, args, settings }) {
        const newPrefix = args[0];
        const response = await setNewPrefix(message.guild, newPrefix, settings);
        await message.reply(response);
    },

    async interactionRun({ interaction, settings }) {
        const response = await setNewPrefix(
            interaction.guild,
            interaction.options.getString("newprefix"),
            settings,
        );
        await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} newPrefix
 * @param {object} settings
 */
async function setNewPrefix(guild, newPrefix, settings) {
    if (newPrefix.length > 2) return guild.getT("core:PREFIX.TOO_LONG");

    settings.prefix = newPrefix;
    await guild.updateSettings("core", settings);

    return guild.getT("core:PREFIX.SUCCESS", { prefix: newPrefix });
}
