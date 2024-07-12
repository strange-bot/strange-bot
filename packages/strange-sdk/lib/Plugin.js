const { Events, ApplicationCommandType } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { Logger, MiscUtils, permissions } = require("./utils");

/**
 * @typedef DashboardSettings
 * @property {boolean} enabled - Whether the dashboard is enabled.
 * @property {import('express').Router} settingsRouter - Express router for the settings page.
 * @property {import('express').Router} adminRouter - Express router for the admin page.
 */

/**
 * Represents a Plugin.
 * @typedef {Object} PluginData
 * @property {string} baseDir - The base directory of the plugin.
 * @property {boolean} [ownerOnly] - Whether the plugin is configured to be owner only.
 * @property {Array<string>} [dependencies] - The dependencies of the plugin.
 * @property {Function|null} [init] - A function that will be called when the plugin is initialized.
 * @property {object|null} [settings] - The settings of the plugin.
 * @property {DashboardSettings|null} [dashboard] - The dashboard settings of the plugin.
 */

class Plugin {
    /**
     * Creates a new Plugin instance.
     * @param {PluginData} data
     */
    constructor(data, _load = true) {
        Logger.debug("Initializing plugin", data);
        Plugin.#validate(data);
        const packageJson = require(path.join(data.baseDir, "package.json"));
        this.name = packageJson.name;
        this.version = packageJson.version;
        this.icon = data.icon || "fa-solid fa-puzzle-piece";
        this.ownerOnly = data.ownerOnly || false;
        this.dependencies = data.dependencies || [];
        this.baseDir = data.baseDir;
        this.init = data.init || null;
        this.settings = data.settings || { enabled: { type: Boolean, default: true } };
        this.dashboard = data.dashboard || { enabled: false };

        /**
         * @type {Map<string, Function>}
         */
        this.eventHandlers = new Map();

        /**
         * @type {Set<import('../typings').CommandType>}
         */
        this.commands = new Set();
        this.contexts = new Set();
        this.prefixCount = 0;
        this.slashCount = 0;

        if (_load) {
            this.load();
        }

        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    load() {
        this.#loadEvents();
        this.#loadCommands();
        this.#loadContexts();
        this.commands.forEach((cmd) => {
            if (cmd.enabled !== false) {
                if (cmd.command?.enabled !== false) this.prefixCount++;
                if (cmd.slashCommand?.enabled !== false) this.slashCount++;
            }
        });
        Logger.debug(`Successfully Loaded plugin "${this.name}"`);
    }

    unload() {
        this.eventHandlers.clear();
        this.commands.clear();
        this.contexts.clear();
        this.prefixCount = 0;
        this.slashCount = 0;
        Logger.debug(`Successfully Unloaded plugin "${this.name}"`);
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
                Plugin.#validateCommand(cmd);
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
                Plugin.#validateContext(context);
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
     * @param {PluginData} data
     */
    static #validate(data) {
        if (typeof data !== "object") {
            throw new TypeError("Plugin data must be an Object.");
        }

        if (!data.baseDir || typeof data.baseDir !== "string") {
            throw new Error("Plugin baseDir must be a string");
        }

        const fs = require("fs");
        if (!fs.existsSync(data.baseDir)) {
            throw new Error("Plugin baseDir does not exist");
        }

        const packageJsonPath = path.join(data.baseDir, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error("No package.json found in plugin directory");
        }

        if (data.icon && typeof data.icon !== "string") {
            throw new Error("Plugin icon must be a string");
        }

        if (data.dependencies && !Array.isArray(data.dependencies)) {
            throw new Error("Plugin dependencies must be an array");
        }

        if (data.init && typeof data.init !== "function") {
            throw new Error("Plugin init must be a function");
        }

        if (data.settings && typeof data.settings !== "object") {
            throw new Error("Plugin settings must be an object");
        }

        if (data.dashboard && typeof data.dashboard !== "object") {
            throw new Error("Plugin dashboard must be an object");
        }

        if (data.dashboard && data.dashboard.enabled) {
            if (data.dashboard.settingsRouter && !data.dashboard.settingsRouter.stack) {
                throw new Error(
                    "Plugin dashboard settingsRouter must be an instance of express.Router",
                );
            }
            if (data.dashboard.adminRouter && !data.dashboard.adminRouter.stack) {
                throw new Error(
                    "Plugin dashboard adminRouter must be an instance of express.Router",
                );
            }
        }
    }

    /**
     * @param {import('typings').CommandType} cmd
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
     * @param {import('typings').ContextType} context
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

module.exports = Plugin;
