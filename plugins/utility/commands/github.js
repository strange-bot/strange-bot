const { ApplicationCommandOptionType } = require("discord.js");
const { HttpUtils, EmbedUtils } = require("strange-sdk/utils");
const { stripIndent } = require("common-tags");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "github",
    description: "utility:GITHUB.DESCRIPTION",
    cooldown: 10,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        aliases: ["git"],
        usage: "<username>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "username",
                description: "utility:GITHUB.USERNAME_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const username = args.join(" ");
        const response = await getGithubUser(message, username, message.author);
        await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const username = interaction.options.getString("username");
        const response = await getGithubUser(interaction, username, interaction.user);
        await interaction.followUp(response);
    },
};

const websiteProvided = (text) => (text.startsWith("http://") ? true : text.startsWith("https://"));

async function getGithubUser({ guild }, target, author) {
    const response = await HttpUtils.getJson(`https://api.github.com/users/${target}`);
    if (response.status === 404) return "```" + guild.getT("utility:GITHUB.NOT_FOUND") + "```";
    if (!response.success) return guild.getT("common:API_ERROR");

    const json = response.data;
    const {
        login: username,
        name,
        id: githubId,
        avatar_url: avatarUrl,
        html_url: userPageLink,
        followers,
        following,
        bio,
        location,
        blog,
    } = json;

    let website = websiteProvided(blog)
        ? `[Click me](${blog})`
        : guild.getT("utility:GITHUB.NOT_PROVIDED");
    if (website == null) website = guild.getT("utility:GITHUB.NOT_PROVIDED");

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: `GitHub User: ${username}`,
            url: userPageLink,
            iconURL: avatarUrl,
        })
        .addFields(
            {
                name: guild.getT("utility:GITHUB.USER_INFO"),
                value: stripIndent`
        **${guild.getT("utility:GITHUB.NAME")}**: *${name || guild.getT("utility:GITHUB.NOT_PROVIDED")}*
        **${guild.getT("utility:GITHUB.LOCATION")}**: *${location}*
        **${guild.getT("utility:GITHUB.ID")}**: *${githubId}*
        **${guild.getT("utility:GITHUB.WEBSITE")}**: *${website}*\n`,
                inline: true,
            },
            {
                name: guild.getT("utility:GITHUB.STATS"),
                value: stripIndent`
                **${guild.getT("utility:GITHUB.FOLLOWERS")}**: *${followers}*
                **${guild.getT("utility:GITHUB.FOLLOWING")}**: *${following}*`,
                inline: true,
            },
        )
        .setDescription(`**Bio**:\n${bio || guild.getT("utility:GITHUB.NOT_PROVIDED")}`)
        .setImage(avatarUrl)
        .setColor(0x6e5494)
        .setFooter({ text: guild.getT("common:REQUESTED_BY", { user: author.username }) });

    return { embeds: [embed] };
}
