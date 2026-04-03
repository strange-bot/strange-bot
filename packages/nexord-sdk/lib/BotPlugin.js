const { Events, ApplicationCommandType } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { MiscUtils, permissions, Logger } = require("./utils");
const Config = require("./Config");
const DBService = require("./DBService");

class BotPlugin {
    constructor(data) {
        Logger.debug("Initializing plugin", data);
        BotPlugin.#validate(data);
        this.pluginDir = path.join(data.baseDir, "..");
        const packageJson = require(path.join(this.pluginDir, "package.json"));
        this.name = packageJson.name;
        this.version = packageJson.version;

        this.baseDir = data.baseDir;
        this.ownerOnly = data.ownerOnly || false;
        this.dependencies = data.dependencies || [];
        this.dbService = data.dbService || null;

        this.onEnable = data.onEnable || null;
        this.onDisable = data.onDisable || null;
        this.onGuildEnable = data.onGuildEnable || null;
        this.onGuildDisable = data.onGuildDisable || null;

        this.eventHandlers = new Map();
        this.ipcEvents = new Map();
        this.commands = new Set();
        this.contexts = new Set();
        this.prefixCount = 0;
        this.slashCount = 0;
        this.userContextsCount = 0;
        this.messageContextsCount = 0;
        this.config = new Config(this.name, this.pluginDir);

        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    async enable(botClient, dbClient) {
        if (!botClient) throw new TypeError("botClient is required");
        if (!dbClient) throw new TypeError("dbClient is required");

        this.#loadEvents();
        this.#loadCommands();
        this.#loadContexts();
        this.commands.forEach((cmd) => {
            if (cmd.enabled !== false) {
                if (cmd.command?.enabled !== false) this.prefixCount++;
                if (cmd.slashCommand?.enabled !== false) this.slashCount++;
            }
        });

        await this.config.init(dbClient);
        const config = await this.config.get();
        await this.dbService?.init(dbClient, config);

        if (this.onEnable) {
            await this.onEnable(botClient);
        }
    }

    async disable(botClient) {
        this.eventHandlers.clear();
        this.commands.clear();
        this.contexts.clear();
        this.prefixCount = 0;
        this.slashCount = 0;
        await this.dbService?.destroy();

        if (this.onDisable) {
            await this.onDisable(botClient);
        }
    }

    async getConfig() {
        return await this.config.get();
    }

    #loadEvents() {
        const eventHandlerPath = `${this.baseDir}/events`;
        if (!fs.existsSync(eventHandlerPath)) {
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

        // Load IPC events
        const ipcEventHandlerPath = `${this.baseDir}/events/ipc`;
        this.ipcEvents = new Map();
        if (fs.existsSync(ipcEventHandlerPath)) {
            const ipcEventFiles = fs
                .readdirSync(ipcEventHandlerPath)
                .filter((file) => file.endsWith(".js"));
            for (const file of ipcEventFiles) {
                const event = file.split(".")[0];
                const eventHandler = require(`${ipcEventHandlerPath}/${file}`);
                if (typeof eventHandler !== "function" && typeof eventHandler !== "object") {
                    throw new Error(
                        `IPC event handler for event ${event} must be a function or object`,
                    );
                }
                this.ipcEvents.set(event, eventHandler);
            }
        }
    }

    #loadCommands() {
        if (!fs.existsSync(`${this.baseDir}/commands`)) {
            return;
        }

        const commandFiles = MiscUtils.recursiveReadDirSync(`${this.baseDir}/commands`);
        for (const file of commandFiles) {
            try {
                const cmd = require(file);
                if (typeof cmd !== "object") continue;
                BotPlugin.#validateCommand(cmd);
                if (cmd.enabled === false) {
                    continue;
                }

                cmd.enabled = cmd.enabled || true;
                cmd.cooldown = cmd.cooldown || 0;
                cmd.botPermissions = cmd.botPermissions || [];
                cmd.userPermissions = cmd.userPermissions || [];
                cmd.validations = cmd.validations || [];
                cmd.command = cmd.command || {};
                cmd.slashCommand = cmd.slashCommand || {};
                cmd.plugin = this;

                this.commands.add(cmd);
            } catch (error) {
                Logger.error(`Error loading command ${file}:`, error);
            } finally {
                delete require.cache[require.resolve(file)];
            }
        }
    }

    #loadContexts() {
        if (!fs.existsSync(`${this.baseDir}/contexts`)) {
            return;
        }

        const contextFiles = MiscUtils.recursiveReadDirSync(`${this.baseDir}/contexts`);
        for (const file of contextFiles) {
            try {
                const context = require(file);
                BotPlugin.#validateContext(context);
                context.plugin = this;
                if (context.type === ApplicationCommandType.User) {
                    this.userContextsCount++;
                } else if (context.type === ApplicationCommandType.Message) {
                    this.messageContextsCount++;
                }
                this.contexts.add(context);
            } catch (error) {
                Logger.error(`Error loading context ${file}:`, error);
            } finally {
                delete require.cache[require.resolve(file)];
            }
        }
    }

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

        if (data.onEnable && typeof data.onEnable !== "function") {
            throw new Error("BotPlugin onEnable must be a function");
        }

        if (data.onDisable && typeof data.onDisable !== "function") {
            throw new Error("BotPlugin onDisable must be a function");
        }

        if (data.onGuildEnable && typeof data.onGuildEnable !== "function") {
            throw new Error("BotPlugin onGuildEnable must be a function");
        }

        if (data.onGuildDisable && typeof data.onGuildDisable !== "function") {
            throw new Error("BotPlugin onGuildDisable must be a function");
        }

        if (data.dbService && !(data.dbService instanceof DBService)) {
            throw new Error("BotPlugin dbService must be an instance of DBService");
        }
    }

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
