const path = require("node:path");
const { Logger } = require("./utils");
const DBClient = require("strange-db-client");
const PluginConfig = require("./PluginConfig");

/**
 * Represents a Plugin.
 * @typedef {object} DashboardPluginData
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

        /** @type {string} The plugin's root directory */
        this.pluginDir = path.join(data.baseDir, "..");

        const packageJson = require(path.join(this.pluginDir, "package.json"));

        /** @type {string} The plugin's name from package.json */
        this.name = packageJson.name;

        /** @type {string} The plugin's version from package.json */
        this.version = packageJson.version;

        /** @type {string} The plugin's base directory containing dashboard-specific files */
        this.baseDir = data.baseDir;

        /** @type {boolean} Whether the plugin is enabled in the dashboard */
        this.enabled = data.enabled || true;

        /** @type {string} FontAwesome icon class used in the dashboard UI */
        this.icon = data.icon || "fa-solid fa-puzzle-piece";

        /** @type {?function(): Promise<void>} Plugin initialization function */
        this.init = data.init || null;

        /**
         * @type {Map<string, import('mongoose').Model>} - Map of registered MongoDB models
         */
        this.models = new Map();

        /** @type {?import('express').Router} Express router for plugin settings page */
        this.settingsRouter = data.settingsRouter || null;

        /** @type {?import('express').Router} Express router for plugin admin page */
        this.adminRouter = data.adminRouter || null;

        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    /**
     * Loads the dashboard plugin
     * @returns {Promise<void>}
     */
    async load() {
        await this.#registerSchemas();
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
    async updateSettings(guild, settings) {
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
     * Retrieves a registered MongoDB model by name
     * @param {string} modelName - The name of the model to retrieve
     * @returns {import('mongoose').Model} The mongoose model
     * @throws {Error} If the model is not registered
     */
    getModel(modelName) {
        const prefixedName = `${this.name}-${modelName}`;
        if (!this.models.has(prefixedName)) {
            throw new Error(`Model ${modelName} is not registered`);
        }
        return this.models.get(prefixedName);
    }

    async #registerSchemas() {
        const schemaPath = path.join(this.baseDir, "..", "schemas.js");
        if (!require("fs").existsSync(schemaPath)) {
            return await DBClient.getInstance().registerPluginSettings(this.name, {
                enabled: { type: String, default: true },
            });
        }

        const schemaFile = require(schemaPath);
        const config = await this.getConfig();
        const schemas = schemaFile(config);

        // Validate structure
        if (typeof schemas !== "object") {
            throw new Error("registerSchemas must return an object");
        }

        // Validate each schema
        for (const [name, schema] of Object.entries(schemas)) {
            if (typeof name !== "string") {
                throw new Error(`Schema name must be a string`);
            }

            if (typeof schema !== "object") {
                throw new Error(`Schema ${name} must be an object`);
            }
        }

        // Register 'settings' schema
        if (schemas.settings) {
            await DBClient.getInstance().registerPluginSettings(this.name, schemas.settings);
            delete schemas.settings;
        } else {
            await DBClient.getInstance().registerPluginSettings(this.name, {
                enabled: { type: String, default: true },
            });
        }

        // Register remaining schemas
        for (const [name, schema] of Object.entries(schemas)) {
            const prefixedName = `${this.name}-${name}`;
            const model = await DBClient.getInstance().registerSchema(prefixedName, schema);
            this.models.set(prefixedName, model);
        }
    }

    /**
     * Validates the plugin data.
     * @param {DashboardPluginData} data - The plugin data to validate.
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
