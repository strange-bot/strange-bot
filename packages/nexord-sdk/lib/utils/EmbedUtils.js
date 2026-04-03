const { EmbedBuilder } = require("discord.js");

/**
 * Utility class for creating and managing Discord embeds
 */
class EmbedUtils {
    /** @type {string} Default bot embed color */
    static #bot = "#068ADD";
    /** @type {string} Success embed color */
    static #success = "#00A56A";
    /** @type {string} Error embed color */
    static #error = "#D61A3C";
    /** @type {string} Transparent embed color */
    static #transparent = "#36393F";

    /**
     * Creates a default embed with bot color
     * @param {object} [options] - The embed options
     * @param {string} [options.title] - The embed title
     * @param {string} [options.description] - The embed description
     * @returns {import('discord.js').EmbedBuilder} The created embed
     */
    static embed(options) {
        const embed = new EmbedBuilder();
        if (options?.title) embed.setTitle(options.title);
        if (options?.description) embed.setDescription(options.description);
        embed.setColor(this.#bot);
        return embed;
    }

    /**
     * Creates a success embed with green color
     * @param {object} [options] - The embed options
     * @param {string} [options.title] - The embed title
     * @param {string} [options.description] - The embed description
     * @returns {import('discord.js').EmbedBuilder} The created embed
     */
    static success(options) {
        return EmbedUtils.embed(options).setColor(this.#success);
    }

    /**
     * Creates an error embed with red color
     * @param {object} [options] - The embed options
     * @param {string} [options.title] - The embed title
     * @param {string} [options.description] - The embed description
     * @returns {import('discord.js').EmbedBuilder} The created embed
     */
    static error(options) {
        return EmbedUtils.embed(options).setColor(this.#error);
    }

    /**
     * Creates a transparent embed matching Discord's dark theme
     * @param {object} [options] - The embed options
     * @param {string} [options.title] - The embed title
     * @param {string} [options.description] - The embed description
     * @returns {import('discord.js').EmbedBuilder} The created embed
     */
    static transparent(options) {
        return EmbedUtils.embed(options).setColor(this.#transparent);
    }

    /**
     * Updates the default embed colors
     * @param {object} [options] - The color options
     * @param {string} [options.bot] - New bot embed color (hex)
     * @param {string} [options.success] - New success embed color (hex)
     * @param {string} [options.error] - New error embed color (hex)
     */
    static setEmbedColor(options) {
        if (options?.bot) EmbedUtils.#bot = options.bot;
        if (options?.success) EmbedUtils.#success = options.success;
        if (options?.error) EmbedUtils.#error = options.error;
    }
}

module.exports = EmbedUtils;
