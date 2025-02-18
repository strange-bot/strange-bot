const fs = require("node:fs");
const path = require("node:path");
const { DBClient, Schema } = require("strange-db-client");
const { Logger } = require("./utils");
const Config = require("./Config");

class DashboardPlugin {
    constructor(data) {
        Logger.debug("Initializing plugin", data);
        DashboardPlugin.#validate(data);
        this.pluginDir = path.join(data.baseDir, "..");
        const packageJson = require(path.join(this.pluginDir, "package.json"));
        this.name = packageJson.name;
        this.version = packageJson.version;
        this.baseDir = data.baseDir;
        this.ownerOnly = data.ownerOnly || false;
        this.icon = data.icon || "fa-solid fa-puzzle-piece";
        this.init = data.init || null;
        this.dashboardRouter = data.dashboardRouter || null;
        this.adminRouter = data.adminRouter || null;
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
        Logger.debug(`Successfully Loaded plugin "${this.name}"`);
    }

    async unload() {
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

    getModel(schema) {
        if (!this.schemas.has(schema)) {
            throw new Error(`Schema ${schema} is not registered with plugin ${this.name}`);
        }
        const prefixedName = `${this.name}.${schema}`;
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

            DashboardPlugin.#validateSchema(schema);
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

        if (Object.prototype.hasOwnProperty.call(data, "ownerOnly")) {
            if (typeof data.ownerOnly !== "boolean") {
                throw new Error("DashboardPlugin ownerOnly must be a boolean");
            }
        }

        if (data.icon && typeof data.icon !== "string") {
            throw new Error("DashboardPlugin icon must be a string");
        }

        if (data.init && typeof data.init !== "function") {
            throw new Error("DashboardPlugin init must be a function");
        }

        if (data.dashboardRouter && !data.dashboardRouter.stack) {
            throw new Error(
                "DashboardPlugin dashboardRouter must be an instance of express.Router",
            );
        }
        if (data.adminRouter && !data.adminRouter.stack) {
            throw new Error("DashboardPlugin adminRouter must be an instance of express.Router");
        }
    }

    static #validateSchema(schema) {
        if (!(schema instanceof Schema)) {
            throw new Error(`Schema must be an instance of Schema`);
        }

        // TODO: Validate schema fields
    }
}

module.exports = DashboardPlugin;
