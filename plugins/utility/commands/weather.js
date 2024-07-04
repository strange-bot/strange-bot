const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");
const config = require("../config");

const API_KEY = config.get("WEATHERSTACK_KEY");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "weather",
    description: "utility:WEATHER.DESCRIPTION",
    cooldown: 5,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        usage: "<place>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "place",
                description: "utility:WEATHER.PLACE_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const place = args.join(" ");
        const response = await weather(message, place);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const place = interaction.options.getString("place");
        const response = await weather(interaction, place);
        await interaction.followUp(response);
    },
};

async function weather({ guild }, place) {
    const response = await HttpUtils.getJson(
        `http://api.weatherstack.com/current?access_key=${API_KEY}&query=${place}`,
    );
    if (!response.success) return guild.getT("common:API_ERROR");

    const json = response.data;
    if (!json.request) return guild.getT("utility:WEATHER.NOT_FOUND", { place });

    const embed = EmbedUtils.embed()
        .setTitle("Weather")
        .setThumbnail(json.current?.weather_icons[0])
        .addFields(
            {
                name: guild.getT("utility:WEATHER.PLACE"),
                value: json.location?.name || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.REGION"),
                value: json.location?.region || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.COUNTRY"),
                value: json.location?.country || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.WEATHER"),
                value: json.current?.weather_descriptions[0] || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.DATE"),
                value: json.location?.localtime.slice(0, 10) || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.TIME"),
                value: json.location?.localtime.slice(11, 16) || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.TEMPERATURE"),
                value: `${json.current?.temperature}°C`,
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.CLOUD_COVER"),
                value: `${json.current?.cloudcover}%`,
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.WIND_SPEED"),
                value: `${json.current?.wind_speed} km/h`,
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.WIND_DIRECTION"),
                value: json.current?.wind_dir || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.PRESSURE"),
                value: `${json.current?.pressure} mb`,
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.PRECIPITATION"),
                value: `${json.current?.precip.toString()} mm`,
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.HUMIDITY"),
                value: json.current?.humidity.toString() || "NA",
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.VISIBILITY"),
                value: `${json.current?.visibility} km`,
                inline: true,
            },
            {
                name: guild.getT("utility:WEATHER.UV_INDEX"),
                value: json.current?.uv_index.toString() || "NA",
                inline: true,
            },
        )

        .setFooter({
            text: guild.getT("utility:WEATHER.LAST_CHECKED", {
                time: json.current?.observation_time,
            }),
        });

    return { embeds: [embed] };
}
