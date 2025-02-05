const { ApplicationCommandOptionType } = require("discord.js");
const { Logger } = require("strange-sdk/utils");

let langChoices = [];
try {
    const meta = require("strange-i18n/languages-meta.json");
    langChoices = meta.map((lang) => ({ name: lang.name, value: lang.name }));
} catch (error) {
    Logger.debug("Missing languages-meta.json", error);
}

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "setlang",
    description: "core:LANG.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<new-lang>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "newlang",
                description: "core:LANG.NEW_LANG",
                type: ApplicationCommandOptionType.String,
                choices: langChoices,
                required: true,
            },
        ],
    },

    async messageRun({ message, args, settings }) {
        const newLang = args[0];
        const response = await setNewLang(message.guild, newLang, settings);
        await message.reply(response);
    },

    async interactionRun({ interaction, settings }) {
        const response = await setNewLang(
            interaction.guild,
            interaction.options.getString("newlang"),
            settings,
        );
        await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} newLang
 * @param {object} settings
 */
async function setNewLang(guild, newLang, settings) {
    if (!langChoices.some((lang) => lang.value === newLang))
        return guild.getT("core:LANG.INVALID_LANG", {
            lang: newLang,
            langChoices: langChoices.map((lang) => lang.value).join(", "),
        });

    settings.locale = newLang;
    await guild.updateSettings("core", settings);

    return guild.getT("core:LANG.SUCCESS", { lang: newLang });
}
