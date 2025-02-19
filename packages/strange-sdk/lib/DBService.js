const { Logger } = require("./utils");

module.exports = class DBService {
    constructor(pluginName) {
        this.name = pluginName;
        this.schemas = new Map();
        this.config = null;
        this.dbClient = null;
    }

    #registerModel(schemaName, schema) {
        if (this.schemas.has(schemaName)) {
            throw new Error(
                `Schema with name ${schemaName} is already registered with plugin ${this.name}`,
            );
        }
        const prefixedName = `${this.name}.${schemaName}`;
        const model = this.dbClient.registerSchema(prefixedName, schema);
        this.schemas.set(schemaName, schema);
        return model;
    }

    async init(dbClient = null, config = null) {
        if (!dbClient) {
            Logger.warn("DBClient is not initialized. Cannot register schemas.");
            return;
        }
        this.dbClient = dbClient;
        this.config = config;
        if (this.defineSchemas && typeof this.defineSchemas === "function") {
            const schemas = this.defineSchemas(config);
            for (const [schemaName, schema] of Object.entries(schemas)) {
                if (schemaName === "settings") {
                    schema.post("save", async (doc) => {
                        await this.cache(`settings:${doc._id}`, doc, 0);
                    });
                }
                this.#registerModel(schemaName, schema);
            }
        }
    }

    defineSchemas() {
        return {};
    }

    getModel(schemaName) {
        const prefixedName = `${this.name}.${schemaName}`;
        try {
            return this.dbClient.getModel(prefixedName);
        } catch (error) {
            throw new Error(
                `Schema with name ${schemaName} is not registered with plugin ${this.name}`,
            );
        }
    }

    async getSettings(guild) {
        if (!this.schemas.has("settings")) {
            return {};
        }
        const guildId = typeof guild === "string" ? guild : guild.id;
        const cached = await this.getCache(`settings:${guildId}`);
        const Model = this.getModel("settings");

        if (cached) {
            const settings = JSON.parse(cached);
            return Model.hydrate(settings);
        }

        const settings = (await Model.findById(guildId)) || new Model({ _id: guildId });

        await this.cache(`settings:${guildId}`, settings, 0);
        return settings;
    }

    async cache(key, value, ttl) {
        const cacheKey = `${this.name}:${key}`;
        await this.dbClient.addToCache(cacheKey, value, ttl);
    }

    async getCache(key, ttl) {
        const cacheKey = `${this.name}:${key}`;
        return await this.dbClient.getFromCache(cacheKey, ttl);
    }
};
