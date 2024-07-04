const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ApplicationCommandOptionType,
    ButtonStyle,
} = require("discord.js");
const { HttpUtils, MiscUtils, EmbedUtils } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "meme",
    description: "fun:MEME.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    cooldown: 20,
    command: {
        enabled: true,
        usage: "[category]",
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "category",
                description: "fun:MEME.CATEGORY_DESC",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun(message, args) {
        const choice = args[0];

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("regenMemeBtn")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("🔁"),
        );
        const embed = await getRandomEmbed(message.guild, choice);

        const sentMsg = await message.safeReply({
            embeds: [embed],
            components: [buttonRow],
        });

        const collector = message.channel.createMessageComponentCollector({
            filter: (reactor) => reactor.user.id === message.author.id,
            time: this.cooldown * 1000,
            max: 3,
            dispose: true,
        });

        collector.on("collect", async (response) => {
            if (response.customId !== "regenMemeBtn") return;
            await response.deferUpdate();

            const embed = await getRandomEmbed(message.guild, choice);
            await sentMsg.edit({
                embeds: [embed],
                components: [buttonRow],
            });
        });

        collector.on("end", () => {
            buttonRow.components.forEach((button) => button.setDisabled(true));
            return sentMsg.edit({
                components: [buttonRow],
            });
        });
    },

    async interactionRun(interaction) {
        const choice = interaction.options.getString("category");

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("regenMemeBtn")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("🔁"),
        );
        const embed = await getRandomEmbed(interaction.guild, choice);

        await interaction.followUp({
            embeds: [embed],
            components: [buttonRow],
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: (reactor) => reactor.user.id === interaction.user.id,
            time: this.cooldown * 1000,
            max: 3,
            dispose: true,
        });

        collector.on("collect", async (response) => {
            if (response.customId !== "regenMemeBtn") return;
            await response.deferUpdate();

            const embed = await getRandomEmbed(interaction.guild, choice);
            await interaction.editReply({
                embeds: [embed],
                components: [buttonRow],
            });
        });

        collector.on("end", () => {
            buttonRow.components.forEach((button) => button.setDisabled(true));
            return interaction.editReply({
                components: [buttonRow],
            });
        });
    },
};

async function getRandomEmbed(guild, choice) {
    const config = guild.client.config.get("core");

    const subReddits = ["meme", "Memes_Of_The_Dank", "memes", "dankmemes"];
    let rand = choice ? choice : subReddits[MiscUtils.getRandomInt(subReddits.length)];

    const response = await HttpUtils.getJson(`https://www.reddit.com/r/${rand}/random/.json`);
    if (!response.success) {
        return EmbedUtils.error().setDescription(guild.getT("fun:MEME.FETCH_FAIL"));
    }

    const json = response.data;
    if (!Array.isArray(json) || json.length === 0) {
        return EmbedUtils.error().setDescription(
            guild.getT("fun:MEME.NO_MATCH", {
                choice,
            }),
        );
    }

    try {
        let permalink = json[0].data.children[0].data.permalink;
        let memeUrl = `https://reddit.com${permalink}`;
        let memeImage = json[0].data.children[0].data.url;
        let memeTitle = json[0].data.children[0].data.title;
        let memeUpvotes = json[0].data.children[0].data.ups;
        let memeNumComments = json[0].data.children[0].data.num_comments;

        return new EmbedBuilder()
            .setAuthor({ name: memeTitle, url: memeUrl })
            .setImage(memeImage)
            .setColor("Random")
            .setFooter({ text: `👍 ${memeUpvotes} | 💬 ${memeNumComments}` });
    } catch (error) {
        return EmbedUtils.error().setDescription(guild.getT("fun:MEME.FETCH_FAIL"));
    }
}
