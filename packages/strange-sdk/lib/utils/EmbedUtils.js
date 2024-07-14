const { EmbedBuilder } = require("discord.js");

class EmbedUtils {
    static #bot = "#068ADD";
    static #success = "#00A56A";
    static #error = "#D61A3C";
    static #transparent = "#36393F";

    /**
     * Creates an embed
     * @param {object} options
     * @param {string} options.title
     * @param {string} options.description
     */
    static embed(options) {
        const embed = new EmbedBuilder();
        if (options?.title) embed.setTitle(options.title);
        if (options?.description) embed.setDescription(options.description);
        embed.setColor(this.#bot);
        return embed;
    }

    /**
     * Creates an embed
     * @param {object} options
     * @param {string} options.title
     * @param {string} options.description
     */
    static success(options) {
        return EmbedUtils.embed(options).setColor(this.#success);
    }

    /**
     * Creates an embed
     * @param {object} options
     * @param {string} options.title
     * @param {string} options.description
     */
    static error(options) {
        return EmbedUtils.embed(options).setColor(this.#error);
    }

    /**
     * Creates a transparent embed
     * @param {object} options
     * @param {string} options.title
     * @param {string} options.description
     */
    static transparent(options) {
        return EmbedUtils.embed(options).setColor(this.#transparent);
    }

    /**
     * Sets the embed color
     * @param {object} options
     * @param {string} options.bot
     * @param {string} options.success
     * @param {string} options.error
     */
    static setEmbedColor(options) {
        if (options?.bot) EmbedUtils.#bot = options.bot;
        if (options?.success) EmbedUtils.#success = options.success;
        if (options?.error) EmbedUtils.#error = options.error;
    }
}

module.exports = EmbedUtils;
