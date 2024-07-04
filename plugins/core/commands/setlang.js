const { ApplicationCommandOptionType } = require("discord.js");
const { Logger } = require("strange-sdk/utils");

let langChoices = [];
try {
    const meta = require("../../../src/locales/languages-meta.json");
    langChoices = meta.languages.map((lang) => ({ name: lang.name, value: lang.name }));
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

    async messageRun(message, args) {
        const newLang = args[0];
        const response = await setNewLang(message.guild, newLang);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const response = await setNewLang(
            interaction.guild,
            interaction.options.getString("newlang"),
        );
        await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} newLang
 */
async function setNewLang(guild, newLang) {
    if (!langChoices.some((lang) => lang.value === newLang))
        return guild.getT("core:LANG.INVALID_LANG", {
            lang: newLang,
            langChoices: langChoices.map((lang) => lang.value).join(", "),
        });

    const settings = guild.getSettings("core");
    settings.locale = newLang;
    await guild.updateSettings();

    return guild.getT("core:LANG.SUCCESS", { lang: newLang });
}
