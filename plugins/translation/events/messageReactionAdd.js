const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isValidEmoji, getLanguagesFromEmoji } = require("country-emoji-languages");
const { translate } = require("../utils");
const { MiscUtils, EmbedUtils } = require("strange-sdk/utils");
const { isTranslated, logTranslation } = require("../schemas/TranslateLog");
const data = require("../data.json");

const TRANSLATE_COOLDOWN = 120;
const cooldownCache = new Map();

/**
 * @param {import('discord.js').User} user
 */
const getTranslationCooldown = (user) => {
    if (cooldownCache.has(user.id)) {
        const remaining = (Date.now() - cooldownCache.get(user.id)) * 0.001;
        if (remaining > TRANSLATE_COOLDOWN) {
            cooldownCache.delete(user.id);
            return 0;
        }
        return TRANSLATE_COOLDOWN - remaining;
    }
    return 0;
};

/**
 * @param {import('discord.js').MessageReaction|import('discord.js').PartialMessageReaction} reaction
 * @param {import('discord.js').User|import('discord.js').PartialUser} user
 */
module.exports = async (reaction, user) => {
    if (!reaction.message.guild) return;
    const settings = reaction.message.guild.getSettings("translation");
    if (!settings.enabled || !settings.flag_translation) return;
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (ex) {
            return; // Failed to fetch message (maybe deleted)
        }
    }
    if (user.partial) await user.fetch();
    if (user.bot) return;

    const { message, emoji } = reaction;

    if (emoji.id || !message.content || !isValidEmoji(emoji.name)) return;

    // cooldown check
    const remaining = getTranslationCooldown(user);
    if (remaining > 0) {
        return message.channel.safeSend(
            message.guild.getT("translation:TR_COOLDOWN", {
                user: user.username,
                time: MiscUtils.timeformat(remaining),
            }),
            5,
        );
    }

    if (await isTranslated(message, emoji)) return;

    const languages = getLanguagesFromEmoji(emoji.name);

    // filter languages for which google translation is available
    const targetCodes = languages.filter(
        (language) => data.GOOGLE_TRANSLATE[language] !== undefined,
    );
    if (targetCodes.length === 0) return;

    // remove english if there are other language codes
    if (targetCodes.length > 1 && targetCodes.includes("en")) {
        targetCodes.splice(targetCodes.indexOf("en"), 1);
    }

    let src;
    let desc = "";
    let translated = 0;
    for (const tc of targetCodes) {
        const response = await translate(message.content, tc);
        if (!response) continue;
        src = response.inputLang;
        desc += `**${response.outputLang}:**\n${response.output}\n\n`;
        translated += 1;
    }

    if (translated === 0) return;

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder({
            url: message.url,
            label: message.guild.getT("translation:TR_BTN_LABEL"),
            style: ButtonStyle.Link,
        }),
    );

    const embed = EmbedUtils.embed()
        .setAuthor({ name: message.guild.getT("translation:TR_EMBED_TITLE", { lng: src }) })
        .setDescription(desc)
        .setFooter({
            text: message.guild.getT("translation:TR_EMBED_FOOTER", { user: user.username }),
            iconURL: user.displayAvatarURL(),
        });

    message.channel.safeSend({ embeds: [embed], components: [btnRow] }).then(
        () => cooldownCache.set(user.id, Date.now()), // set cooldown
    );

    logTranslation(message, emoji);
};
