const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "flagtranslation",
    description: "translation:FLAGTR_DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        aliases: ["flagtr"],
        minArgsCount: 1,
        usage: "<on/off>",
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "status",
                description: "translation:FLAGTR_STATUS_DESC",
                required: true,
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: "ON",
                        value: "ON",
                    },
                    {
                        name: "OFF",
                        value: "OFF",
                    },
                ],
            },
        ],
    },

    async messageRun(message, args) {
        const status = args[0].toLowerCase();
        if (!["on", "off"].includes(status))
            return message.safeReply("Invalid status. Value must be `on/off`");

        const response = await setFlagTranslation(message, status);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = await setFlagTranslation(
            interaction,
            interaction.options.getString("status"),
        );
        await interaction.followUp(response);
    },
};

async function setFlagTranslation({ guild }, input) {
    const settings = guild.getSettings("translation");
    const status = input.toLowerCase() === "on" ? true : false;

    settings.flag_translation = status;
    await guild.updateSettings();

    return status
        ? guild.getT("translation:FLAGTR_ENABLED")
        : guild.getT("translation:FLAGTR_DISABLED");
}
