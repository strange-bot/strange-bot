const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");
const timestampToDate = require("timestamp-to-date");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "covid",
    description: "utility:COVID.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<country>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "country",
                description: "utility:COVID.COUNTRY_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const country = args.join(" ");
        const response = await getCovid(message, country);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const country = interaction.options.getString("country");
        const response = await getCovid(interaction, country);
        await interaction.followUp(response);
    },
};

async function getCovid({ guild }, country) {
    const response = await HttpUtils.getJson(`https://disease.sh/v2/countries/${country}`);

    if (response.status === 404) return "```css\n" + guild.getT("utility:COVID.NOT_FOUND") + "```";
    if (!response.success) return guild.getT("common:API_ERROR");
    const { data } = response;

    const mg = timestampToDate(data?.updated, "dd.MM.yyyy at HH:mm");
    const embed = EmbedUtils.embed()
        .setTitle(`Covid - ${data?.country}`)
        .setThumbnail(data?.countryInfo.flag)
        .addFields(
            {
                name: guild.getT("utility:COVID.CASES_TOTAL"),
                value: data?.cases.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.CASES_TODAY"),
                value: data?.todayCases.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.DEATHS_TOTAL"),
                value: data?.deaths.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.DEATHS_TODAY"),
                value: data?.todayDeaths.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.RECOVERED"),
                value: data?.recovered.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.ACTIVE"),
                value: data?.active.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.CRITICAL"),
                value: data?.critical.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.CASES_PER_MILLION"),
                value: data?.casesPerOneMillion.toString(),
                inline: true,
            },
            {
                name: guild.getT("utility:COVID.DEATHS_PER_MILLION"),
                value: data?.deathsPerOneMillion.toString(),
                inline: true,
            },
        )
        .setFooter({ text: guild.getT("utility:COVID.LAST_UPDATED", { date: mg }) });

    return { embeds: [embed] };
}
