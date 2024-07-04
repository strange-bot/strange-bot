const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");
const { stripIndent } = require("common-tags");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "pokedex",
    description: "utility:POKEDEX.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    cooldown: 5,
    command: {
        enabled: true,
        usage: "<pokemon>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "pokemon",
                description: "utility:POKEDEX.POKEMON_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const pokemon = args.join(" ");
        const response = await pokedex(message, pokemon);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const pokemon = interaction.options.getString("pokemon");
        const response = await pokedex(interaction, pokemon);
        await interaction.followUp(response);
    },
};

async function pokedex({ guild }, pokemon) {
    const response = await HttpUtils.getJson(`https://pokeapi.glitch.me/v1/pokemon/${pokemon}`);
    if (response.status === 404) return "```" + guild.getT("utility:POKEDEX.NOT_FOUND") + "```";
    if (!response.success) return guild.getT("common:API_ERROR");

    const json = response.data[0];

    const embed = EmbedUtils.embed()
        .setTitle(`Pokédex - ${json.name}`)
        .setThumbnail(json.sprite)
        .setDescription(
            stripIndent`
      ♢ **${guild.getT("utility:POKEDEX.ID")}**: ${json.number}
      ♢ **${guild.getT("utility:POKEDEX.NAME")}**: ${json.name}
      ♢ **${guild.getT("utility:POKEDEX.SPECIES")}**: ${json.species}
      ♢ **${guild.getT("utility:POKEDEX.TYPE")}**: ${json.types}
      ♢ **${guild.getT("utility:POKEDEX.ABILITIES_NORMAL")}**: ${json.abilities.normal}
      ♢ **${guild.getT("utility:POKEDEX.ABILITIES_HIDDEN")}**: ${json.abilities.hidden}
      ♢ **${guild.getT("utility:POKEDEX.EGG_GROUP")}**: ${json.eggGroups}
      ♢ **${guild.getT("utility:POKEDEX.GENDER")}**: ${json.gender}
      ♢ **${guild.getT("utility:POKEDEX.HEIGHT")}**: ${json.height} foot tall
      ♢ **${guild.getT("utility:POKEDEX.WEIGHT")}**: ${json.weight}
      ♢ **${guild.getT("utility:POKEDEX.EVOLUTION")}**: ${json.family.evolutionStage}
      ♢ **${guild.getT("utility:POKEDEX.EVOLUTION_LINE")}**: ${json.family.evolutionLine}
      ♢ **${guild.getT("utility:POKEDEX.IS_STARTER")}**: ${json.starter}
      ♢ **${guild.getT("utility:POKEDEX.IS_LEGENDARY")}**: ${json.legendary}
      ♢ **${guild.getT("utility:POKEDEX.IS_MYTHICAL")}**: ${json.mythical}
      ♢ **${guild.getT("utility:POKEDEX.IS_GENERATION")}**: ${json.gen}
    `,
        )
        .setFooter({ text: json.description });

    return { embeds: [embed] };
}
