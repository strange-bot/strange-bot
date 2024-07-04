const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ApplicationCommandOptionType,
    ButtonStyle,
} = require("discord.js");
const { addSuggestion } = require("../schemas/Suggestions");
const { stripIndent } = require("common-tags");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "suggest",
    description: "suggestion:SUGGEST.DESCRIPTION",
    cooldown: 20,
    command: {
        enabled: true,
        usage: "<suggestion>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "suggestion",
                description: "suggestion:SUGGEST.SUGGESTION_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun(message, args) {
        const suggestion = args.join(" ");

        const response = await suggest(message, suggestion);
        if (typeof response === "boolean")
            return message.channel.safeSend(message.guild.getT("suggestion:SUGGEST.SUCCESS"), 5);
        else await message.safeReply(response);
    },

    async interactionRun(interaction) {
        const suggestion = interaction.options.getString("suggestion");

        const response = await suggest(interaction, suggestion);
        if (typeof response === "boolean") interaction.followUpT("suggestion:SUGGEST.SUCCESS");
        else await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').Message|import('discord.js').ChatInputCommandInteraction} data
 * @param {string} suggestion
 */
async function suggest({ guild, member }, suggestion) {
    const settings = guild.getSettings("suggestion");
    if (!settings.enabled) return guild.getT("suggestion:SUGGEST.DISABLED");
    if (!settings.channel_id) return guild.getT("suggestion:SUGGEST.CHANNEL_NOT_SET");
    const channel = member.guild.channels.cache.get(settings.channel_id);
    if (!channel) return guild.getT("suggestion:SUGGEST.CHANNEL_NOT_FOUND");

    const embed = new EmbedBuilder()
        .setAuthor({ name: guild.getT("suggestion:SUGGEST.TITLE") })
        .setThumbnail(member.user.avatarURL())
        .setColor(settings.default_embed)
        .setDescription(
            stripIndent`
        ${suggestion}

        **${guild.getT("suggestion:SUGGEST.SUBMITTER")}** 
        ${member.user.username} [${member.id}]
      `,
        )
        .setTimestamp();

    let buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("suggestion:APPROVE_BTN")
            .setLabel(guild.getT("suggestion:SUGGEST.APPROVE_BTN_LABEL"))
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("suggestion:REJECT_BTN")
            .setLabel(guild.getT("suggestion:SUGGEST.REJECT_BTN_LABEL"))
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("suggestion:DELETE_BTN")
            .setLabel(guild.getT("suggestion:SUGGEST.DELETE_BTN_LABEL"))
            .setStyle(ButtonStyle.Secondary),
    );

    try {
        const sentMsg = await channel.send({
            embeds: [embed],
            components: [buttonsRow],
        });

        await sentMsg.react(settings.upvote_emoji);
        await sentMsg.react(settings.downvote_emoji);

        await addSuggestion(sentMsg, member.id, suggestion);

        return true;
    } catch (ex) {
        member.client.logger.error("suggest", ex);
        return guild.getT("suggestion:SUGGEST.ERROR");
    }
}
