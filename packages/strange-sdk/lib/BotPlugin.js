const { Events, ApplicationCommandType } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { Logger, MiscUtils, permissions } = require("./utils");
const DBClient = require("strange-db-client");
const PluginConfig = require("./PluginConfig");

/**
 * Represents a Bot Plugin.
 * @typedef {object} BotPluginData
 * @property {string} baseDir - The base directory of the plugin.
 * @property {boolean} [ownerOnly] - Whether the plugin is configured to be owner only.
 * @property {Array<string>} [dependencies] - The dependencies of the plugin.
 * @property {function(import('discord.js').Client): Promise<void>} [init] - The initialization function (optional)
 * @property {function(object): object} [registerSchemas] - The settings function (optional)
 * @property {{[key: string]: (message: any, client: import('discord.js').Client) => Promise<{success: boolean, data?: any, error?: string}>}} ipcHandler - Object containing message handler functions
 */

/**
 * Bot Plugin class for managing Discord bot plugins
 * Handles loading of commands, events, and contexts for a bot plugin
 */
class BotPlugin {
    /**
     * Creates a new Bot Plugin instance
     * @param {BotPluginData} data - Plugin initialization data
     * @throws {TypeError} If plugin data is invalid
     */
    constructor(data) {
        Logger.debug("Initializing plugin", data);
        BotPlugin.#validate(data);

        /** @type {string} The plugin's root directory */
        this.pluginDir = path.join(data.baseDir, "..");

        const packageJson = require(path.join(this.pluginDir, "package.json"));

        /** @type {string} The plugin's name from package.json */
        this.name = packageJson.name;

        /** @type {string} The plugin's version from package.json */
        this.version = packageJson.version;

        /** @type {string} The plugin's base directory containing bot-specific files */
        this.baseDir = data.baseDir;

        /** @type {boolean} Whether the plugin is restricted to bot owners */
        this.ownerOnly = data.ownerOnly || false;

        /** @type {string[]} List of other plugins this plugin depends on */
        this.dependencies = data.dependencies || [];

        /** @type {?function(import('discord.js').Client): Promise<void>} Plugin initialization function */
        this.init = data.init || null;

        /** @type {?function(object): object} Function to register database schemas */
        this.registerSchemas = data.registerSchemas || null;

        /** @type {{[key: string]: (message: any, client: import('discord.js').Client) => Promise<{success: boolean, data?: any, error?: string}>}} - Object containing message handler functions */
        this.ipcHandler = data.ipcHandler || {};
        /**
         * @type {Map<string, import('mongoose').Model>} - Map of registered MongoDB models
         */
        this.models = new Map();

        /**
         * @type {Map<string, Function>} - Map of event handlers
         */
        this.eventHandlers = new Map();

        /**
         * @type {Set<import('../typings').CommandType>} - Set of loaded commands
         */
        this.commands = new Set();

        /** @type {Set<import('../typings').ContextType>} */
        this.contexts = new Set();

        /** @type {number} Counter for enabled prefix commands */
        this.prefixCount = 0;

        /** @type {number} Counter for enabled slash commands */
        this.slashCount = 0;

        Logger.debug(`Initialized bot plugin "${this.name}"`);
    }

    /**
     * Loads the plugin by registering events, commands, and schemas
     * @returns {Promise<void>}
     */
    async load() {
        this.#loadEvents();
        this.#loadCommands();
        this.#loadContexts();
        this.commands.forEach((cmd) => {
            if (cmd.enabled !== false) {
                if (cmd.command?.enabled !== false) this.prefixCount++;
                if (cmd.slashCommand?.enabled !== false) this.slashCount++;
            }
        });
        await this.#registerSchemas();
        Logger.debug(`Successfully Loaded plugin "${this.name}"`);
    }

    /**
     * Unloads the plugin by clearing all registered handlers and commands
     * @returns {Promise<void>}
     */
    async unload() {
        this.eventHandlers.clear();
        this.commands.clear();
        this.contexts.clear();
        this.prefixCount = 0;
        this.slashCount = 0;
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

    /**
     * Retrieves the plugin configuration
     * @returns {Promise<object>} The plugin configuration
     */
    async getConfig() {
        if (process.env.NODE_ENV !== "production") {
            return PluginConfig.fromDirectory(this.pluginDir);
        }
        return DBClient.getInstance().getPluginConfig(this.name);
    }

    /**
     * Updates the plugin configuration
     * @param {object} config - The new configuration object
     * @returns {Promise<void>}
     */
    async setConfig(config) {
        await DBClient.getInstance().updatePluginConfig(this.name, config);
    }

    /**
     * Retrieves a registered MongoDB model by name
     * @param {string} modelName - The name of the model to retrieve
     * @returns {Promise<import('mongoose').Model>} The mongoose model
     * @throws {Error} If the model is not registered
     */
    async getModel(modelName) {
        const prefixedName = `${this.name}-${modelName}`;
        if (!this.models.has(prefixedName)) {
            throw new Error(`Model ${modelName} is not registered`);
        }
        return this.models.get(prefixedName);
    }

    async #registerSchemas() {
        if (!this.registerSchemas) return;
        const config = await this.getConfig();
        const schemas = this.registerSchemas(config);

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
        }

        // Register remaining schemas
        for (const [name, schema] of Object.entries(schemas)) {
            const prefixedName = `${this.name}-${name}`;
            await DBClient.getInstance().registerSchema(prefixedName, schema);
        }
    }

    #loadEvents() {
        Logger.debug(`Loading events for plugin ${this.name}`);
        const eventHandlerPath = `${this.baseDir}/events`;
        if (!fs.existsSync(eventHandlerPath)) {
            Logger.debug(`No events directory found for plugin ${this.name}`);
            return;
        }

        const eventFiles = fs.readdirSync(eventHandlerPath).filter((file) => file.endsWith(".js"));
        for (const file of eventFiles) {
            const event = file.split(".")[0];
            if (!Object.values(Events).includes(event)) {
                throw new Error(`Invalid event: ${event}`);
            }

            const eventHandler = require(`${eventHandlerPath}/${file}`);
            if (typeof eventHandler !== "function") {
                throw new Error(`Event handler for event ${event} must be a function`);
            }

            this.eventHandlers.set(event, eventHandler);
        }
    }

    #loadCommands() {
        Logger.debug(`Loading commands for plugin ${this.name}`);

        if (!fs.existsSync(`${this.baseDir}/commands`)) {
            Logger.debug(`No commands directory found for plugin ${this.name}`);
            return;
        }

        const commandFiles = MiscUtils.recursiveReadDirSync(`${this.baseDir}/commands`);
        for (const file of commandFiles) {
            try {
                const cmd = require(file);
                if (typeof cmd !== "object") continue;
                BotPlugin.#validateCommand(cmd);
                if (cmd.enabled === false) {
                    Logger.debug(`Command ${cmd.name} is disabled`);
                    continue;
                }
                cmd.plugin = this;
                this.commands.add(cmd);
                Logger.debug(`Loaded command: ${cmd.name}`);
            } catch (error) {
                Logger.error(
                    `Error loading command ${file} for plugin ${this.name}: ${error.message}`,
                    error,
                );
            } finally {
                delete require.cache[require.resolve(file)];
            }
        }

        Logger.debug(`Loaded ${this.commands.size} commands for plugin ${this.name}`);
    }

    #loadContexts() {
        Logger.debug(`Loading contexts for plugin ${this.name}`);

        if (!fs.existsSync(`${this.baseDir}/contexts`)) {
            Logger.debug(`No contexts directory found for plugin ${this.name}`);
            return;
        }

        const contextFiles = MiscUtils.recursiveReadDirSync(`${this.baseDir}/contexts`);
        for (const file of contextFiles) {
            try {
                const context = require(file);
                BotPlugin.#validateContext(context);
                context.plugin = this;
                this.contexts.add(context);
            } catch (error) {
                Logger.error(
                    `Error loading context ${file} for plugin ${this.name}: ${error.message}`,
                    error,
                );
            } finally {
                delete require.cache[require.resolve(file)];
            }
        }

        Logger.debug(`Loaded ${this.contexts.size} contexts for plugin ${this.name}`);
    }

    /**
     * Validates the plugin data.
     * @param {BotPluginData} data - The plugin data to validate.
     */
    static #validate(data) {
        if (typeof data !== "object") {
            throw new TypeError("BotPlugin data must be an Object.");
        }

        if (!data.baseDir || typeof data.baseDir !== "string") {
            throw new Error("BotPlugin baseDir must be a string");
        }

        const fs = require("fs");
        if (!fs.existsSync(data.baseDir)) {
            throw new Error("BotPlugin baseDir does not exist");
        }

        const packageJsonPath = path.join(data.baseDir, "../package.json");
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error("No package.json found in plugin directory");
        }

        if (data.dependencies && !Array.isArray(data.dependencies)) {
            throw new Error("BotPlugin dependencies must be an array");
        }

        if (data.init && typeof data.init !== "function") {
            throw new Error("BotPlugin init must be a function");
        }

        if (data.registerSchemas && typeof data.registerSchemas !== "function") {
            throw new Error("BotPlugin registerSchemas must be a function");
        }

        if (data.ipcHandler && typeof data.ipcHandler !== "object") {
            throw new Error("BotPlugin ipcHandler must be an object");
        }
    }

    /**
     * @param {import('typings').CommandType} cmd - The command to validate.
     */
    static #validateCommand(cmd) {
        if (typeof cmd !== "object") {
            throw new TypeError("Command data must be an Object.");
        }
        if (typeof cmd.name !== "string" || cmd.name !== cmd.name.toLowerCase()) {
            throw new Error("Command name must be a lowercase string.");
        }
        if (typeof cmd.description !== "string") {
            throw new TypeError("Command description must be a string.");
        }
        if (cmd.cooldown && typeof cmd.cooldown !== "number") {
            throw new TypeError("Command cooldown must be a number");
        }
        if (cmd.userPermissions) {
            if (!Array.isArray(cmd.userPermissions)) {
                throw new TypeError(
                    "Command userPermissions must be an Array of permission key strings.",
                );
            }
            for (const perm of cmd.userPermissions) {
                if (!permissions[perm])
                    throw new RangeError(`Invalid command userPermission: ${perm}`);
            }
        }
        if (cmd.botPermissions) {
            if (!Array.isArray(cmd.botPermissions)) {
                throw new TypeError(
                    "Command botPermissions must be an Array of permission key strings.",
                );
            }
            for (const perm of cmd.botPermissions) {
                if (!permissions[perm])
                    throw new RangeError(`Invalid command botPermission: ${perm}`);
            }
        }
        if (cmd.validations) {
            if (!Array.isArray(cmd.validations)) {
                throw new TypeError("Command validations must be an Array of validation Objects.");
            }
            for (const validation of cmd.validations) {
                if (typeof validation !== "object") {
                    throw new TypeError("Command validations must be an object.");
                }
                if (typeof validation.callback !== "function") {
                    throw new TypeError("Command validation callback must be a function.");
                }
                if (typeof validation.message !== "string") {
                    throw new TypeError("Command validation message must be a string.");
                }
            }
        }

        // Validate Command Details
        if (cmd.command) {
            if (typeof cmd.command !== "object") {
                throw new TypeError("Command.command must be an object");
            }
            if (
                Object.prototype.hasOwnProperty.call(cmd.command, "enabled") &&
                typeof cmd.command.enabled !== "boolean"
            ) {
                throw new TypeError("Command.command enabled must be a boolean value");
            }
            if (
                cmd.command.aliases &&
                (!Array.isArray(cmd.command.aliases) ||
                    cmd.command.aliases.some(
                        (ali) => typeof ali !== "string" || ali !== ali.toLowerCase(),
                    ))
            ) {
                throw new TypeError(
                    "Command.command aliases must be an Array of lowercase strings.",
                );
            }
            if (cmd.command.usage && typeof cmd.command.usage !== "string") {
                throw new TypeError("Command.command usage must be a string");
            }
            if (cmd.command.minArgsCount && typeof cmd.command.minArgsCount !== "number") {
                throw new TypeError("Command.command minArgsCount must be a number");
            }
            if (cmd.command.subcommands && !Array.isArray(cmd.command.subcommands)) {
                throw new TypeError("Command.command subcommands must be an array");
            }
            if (cmd.command.subcommands) {
                for (const sub of cmd.command.subcommands) {
                    if (typeof sub !== "object") {
                        throw new TypeError(
                            "Command.command subcommands must be an array of objects",
                        );
                    }
                    if (typeof sub.trigger !== "string") {
                        throw new TypeError("Command.command subcommand trigger must be a string");
                    }
                    if (typeof sub.description !== "string") {
                        throw new TypeError(
                            "Command.command subcommand description must be a string",
                        );
                    }
                }
            }
            if (cmd.command.enabled && typeof cmd.messageRun !== "function") {
                throw new TypeError("Missing 'messageRun' function");
            }
        }

        // Validate Slash Command Details
        if (cmd.slashCommand) {
            if (typeof cmd.slashCommand !== "object") {
                throw new TypeError("Command.slashCommand must be an object");
            }
            if (
                Object.prototype.hasOwnProperty.call(cmd.slashCommand, "enabled") &&
                typeof cmd.slashCommand.enabled !== "boolean"
            ) {
                throw new TypeError("Command.slashCommand enabled must be a boolean value");
            }
            if (
                Object.prototype.hasOwnProperty.call(cmd.slashCommand, "ephemeral") &&
                typeof cmd.slashCommand.ephemeral !== "boolean"
            ) {
                throw new TypeError("Command.slashCommand ephemeral must be a boolean value");
            }
            if (cmd.slashCommand.options && !Array.isArray(cmd.slashCommand.options)) {
                throw new TypeError("Command.slashCommand options must be a array");
            }
            if (cmd.slashCommand.enabled && typeof cmd.interactionRun !== "function") {
                throw new TypeError("Missing 'interactionRun' function");
            }
        }
    }

    /**
     * @param {import('typings').ContextType} context - The context to validate.
     */
    static #validateContext(context) {
        if (typeof context !== "object") {
            throw new TypeError("Context must be an object");
        }
        if (typeof context.name !== "string" || context.name !== context.name.toLowerCase()) {
            throw new Error("Context name must be a lowercase string.");
        }
        if (typeof context.description !== "string") {
            throw new TypeError("Context description must be a string.");
        }
        if (
            context.type !== ApplicationCommandType.User &&
            context.type !== ApplicationCommandType.Message
        ) {
            throw new TypeError("Context type must be a either User/Message.");
        }
        if (
            Object.prototype.hasOwnProperty.call(context, "enabled") &&
            typeof context.enabled !== "boolean"
        ) {
            throw new TypeError("Context enabled must be a boolean value");
        }
        if (
            Object.prototype.hasOwnProperty.call(context, "ephemeral") &&
            typeof context.ephemeral !== "boolean"
        ) {
            throw new TypeError("Context enabled must be a boolean value");
        }
        if (
            Object.prototype.hasOwnProperty.call(context, "defaultPermission") &&
            typeof context.defaultPermission !== "boolean"
        ) {
            throw new TypeError("Context defaultPermission must be a boolean value");
        }
        if (
            Object.prototype.hasOwnProperty.call(context, "cooldown") &&
            typeof context.cooldown !== "number"
        ) {
            throw new TypeError("Context cooldown must be a number");
        }
        if (context.userPermissions) {
            if (!Array.isArray(context.userPermissions)) {
                throw new TypeError(
                    "Context userPermissions must be an Array of permission key strings.",
                );
            }
            for (const perm of context.userPermissions) {
                if (!permissions[perm])
                    throw new RangeError(`Invalid command userPermission: ${perm}`);
            }
        }
    }
}

module.exports = BotPlugin;
