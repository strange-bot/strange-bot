const path = require("node:path");
const { Logger } = require("./utils");
const DBClient = require("strange-db-client");
const PluginConfig = require("./PluginConfig");

/**
 * Represents a Plugin.
 * @typedef {Object} DashboardPluginData
 * @property {string} baseDir - The base directory of the plugin.
 * @property {boolean} [enabled] - Whether the plugin is enabled.
 * @property {string} [icon] - The icon of the plugin.
 * @property {function(): Promise<void>} [init] - The init function to be executed when the plugin is loaded by the dashboard
 * @property {import('express').Router} settingsRouter - Express router for the settings page.
 * @property {import('express').Router} adminRouter - Express router for the admin page.
 */

/**
 * Dashboard Plugin class for managing dashboard UI plugins
 * Handles settings, admin routes, and configuration for dashboard plugins
 */
class DashboardPlugin {
    /**
     * Creates a new Dashboard Plugin instance
     * @param {DashboardPluginData} data - Plugin initialization data
     * @throws {TypeError} If plugin data is invalid
     */
    constructor(data) {
        Logger.debug("Initializing plugin", data);
        DashboardPlugin.#validate(data);
        this.pluginDir = path.join(data.baseDir, "..");
        const packageJson = require(path.join(this.pluginDir, "package.json"));
        this.name = packageJson.name;
        this.version = packageJson.version;
        this.baseDir = data.baseDir;
        this.enabled = data.enabled || true;
        this.icon = data.icon || "fa-solid fa-puzzle-piece";
        this.init = data.init || null;
        this.settingsRouter = data.settingsRouter || null;
        this.adminRouter = data.adminRouter || null;

        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    /**
     * Loads the dashboard plugin
     * @returns {Promise<void>}
     */
    async load() {
        Logger.debug(`Successfully Loaded plugin "${this.name}"`);
    }

    /**
     * Unloads the dashboard plugin
     * @returns {Promise<void>}
     */
    async unload() {
        Logger.debug(`Successfully Unloaded plugin "${this.name}"`);
    }

    /**
     * Gets plugin settings for a specific guild
     * @param {import('discord.js').Guild|string} guild - The guild or guild ID
     * @returns {Promise<object>} The plugin settings for the guild
     */
    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        return await DBClient.getInstance().getPluginSettings(guildId, this.name);
    }

    /**
     * Updates plugin settings for a specific guild
     * @param {import('discord.js').Guild|string} guild - The guild or guild ID
     * @param {object} settings - The new settings object
     * @returns {Promise<void>}
     */
    async setSettings(guild, settings) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        await DBClient.getInstance().updatePluginSettings(guildId, this.name, settings);
    }

    async getConfig() {
        if (process.env.NODE_ENV !== "production") {
            return PluginConfig.fromDirectory(this.pluginDir);
        }
        return DBClient.getInstance().getPluginConfig(this.name);
    }

    async setConfig(config) {
        await DBClient.getInstance().updatePluginConfig(this.name, config);
    }

    /**
     * Validates the plugin data.
     * @param {DashboardPluginData} data
     */
    static #validate(data) {
        if (typeof data !== "object") {
            throw new TypeError("DashboardPlugin data must be an Object.");
        }

        if (!data.baseDir || typeof data.baseDir !== "string") {
            throw new Error("DashboardPlugin baseDir must be a string");
        }

        const fs = require("fs");
        if (!fs.existsSync(data.baseDir)) {
            throw new Error("DashboardPlugin baseDir does not exist");
        }

        const packageJsonPath = path.join(data.baseDir, "../package.json");
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error("No package.json found in plugin directory");
        }

        if (Object.prototype.hasOwnProperty.call(data, "enabled")) {
            if (typeof data.enabled !== "boolean") {
                throw new Error("DashboardPlugin enabled must be a boolean");
            }
        }

        if (data.icon && typeof data.icon !== "string") {
            throw new Error("DashboardPlugin icon must be a string");
        }

        if (data.init && typeof data.init !== "function") {
            throw new Error("DashboardPlugin init must be a function");
        }

        if (data.enabled) {
            if (data.settingsRouter && !data.settingsRouter.stack) {
                throw new Error(
                    "DashboardPlugin settingsRouter must be an instance of express.Router",
                );
            }
            if (data.adminRouter && !data.adminRouter.stack) {
                throw new Error(
                    "DashboardPlugin adminRouter must be an instance of express.Router",
                );
            }
        }
    }
}

module.exports = DashboardPlugin;
