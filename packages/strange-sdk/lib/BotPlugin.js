const { Events, ApplicationCommandType } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { Schema, DBClient } = require("strange-db-client");
const { MiscUtils, permissions, Logger } = require("./utils");
const Config = require("./Config");

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
        this.init = data.init || null;
        this.ipcHandler = data.ipcHandler || {};
        this.eventHandlers = new Map();
        this.commands = new Set();
        this.contexts = new Set();
        this.prefixCount = 0;
        this.slashCount = 0;
        this.config = new Config(this.name, this.pluginDir);
        this.dbClient = null;
        this.schemas = new Map();
        Logger.debug(`Initialized plugin "${this.name}"`);
    }

    async load(dbClient = null) {
        if (dbClient && !(dbClient instanceof DBClient)) {
            throw new TypeError("dbClient must be an instance of DBClient");
        }

        this.dbClient = dbClient;
        if (dbClient) {
            await this.config.init(this.dbClient);
        }
        await this.#registerSchemas();
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

    async unload() {
        this.eventHandlers.clear();
        this.commands.clear();
        this.contexts.clear();
        this.prefixCount = 0;
        this.slashCount = 0;
        Logger.debug(`Successfully Unloaded plugin "${this.name}"`);
    }

    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        const cached = await this.getCache(`settings:${guildId}`, 5 * 60);

        if (cached) {
            return cached === "null"
                ? this.getModel("settings")({ _id: guildId })
                : this.getModel("settings").hydrate(cached);
        }

        const settings = await this.getModel("settings").findById(guildId);
        await this.cache(`settings:${guildId}`, settings ? settings.toObject() : "null", 5 * 60);
        return settings || this.getModel("settings")({ _id: guildId });
    }

    async updateSettings(guild, settings) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        await this.getModel("settings").updateOne(
            { _id: guildId },
            { $set: settings },
            { upsert: true },
        );
    }

    async getConfig() {
        return await this.config.get();
    }

    async setConfig(newConfig) {
        await this.config.save(newConfig);
    }

    getModel(schemaName) {
        if (!this.schemas.has(schemaName)) {
            throw new Error(`Schema ${schemaName} is not registered with plugin ${this.name}`);
        }
        const prefixedName = `${this.name}.${schemaName}`;
        return this.dbClient.getModel(prefixedName);
    }

    async reloadConfigSchemas() {
        const config = await this.config.get();
        for (const [schemaName, schemaRequire] of this.schemas) {
            if (typeof schemaRequire !== "function") {
                continue;
            }
            const schema = schemaRequire(config);
            const prefixedName = `${this.name}.${schemaName}`;
            this.dbClient.reloadSchema(prefixedName, schema);
        }
    }

    async cache(key, value, ttl) {
        const prefixedKey = `${this.name}:${key}`;
        return await this.dbClient.addToCache(prefixedKey, value, ttl);
    }

    async getCache(key, ttl) {
        const prefixedKey = `${this.name}:${key}`;
        return await this.dbClient.getFromCache(prefixedKey, ttl);
    }

    async #registerSchemas() {
        const schemasDir = path.join(this.baseDir, "..", "schemas");
        if (!fs.existsSync(schemasDir)) return;

        const schemaFiles = fs.readdirSync(schemasDir).filter((file) => file.endsWith(".js"));
        for (const file of schemaFiles) {
            const schemaRequire = require(path.join(schemasDir, file));
            const schemaName = file.split(".")[0];

            let schema = schemaRequire;
            if (typeof schemaRequire === "function") {
                const config = await this.config.get();
                schema = schemaRequire(config);
            }

            BotPlugin.#validateSchema(schema);
            if (this.schemas.has(schemaName)) {
                throw new Error(
                    `Schema with name ${schemaName} is already registered with plugin ${this.name}`,
                );
            }

            if (this.dbClient) {
                const prefixedName = `${this.name}.${schemaName}`;
                this.dbClient.registerSchema(prefixedName, schema);
            }
            this.schemas.set(schemaName, schemaRequire);
        }
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
                this.contexts.add(context);
            } catch (error) {
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

        if (data.init && typeof data.init !== "function") {
            throw new Error("BotPlugin init must be a function");
        }

        if (data.ipcHandler && typeof data.ipcHandler !== "object") {
            throw new Error("BotPlugin ipcHandler must be an object");
        }
    }

    static #validateSchema(schema) {
        if (!(schema instanceof Schema)) {
            throw new Error(`Schema must be an instance of Schema`);
        }

        // TODO: Validate schema fields
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
