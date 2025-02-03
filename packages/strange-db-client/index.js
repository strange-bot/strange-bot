const mongoose = require("mongoose");
const Redis = require("ioredis");

class DatabaseClient {
    static instance = null;

    constructor(options) {
        if (DatabaseClient.instance) {
            return DatabaseClient.instance;
        }

        if (!options?.mongoUri || !options?.redisUri) {
            throw new Error("MongoDB and Redis URIs are required");
        }

        this.options = options;
        this.redis = null;
        this.settingsSchema = null;
        this.configSchema = null;
        this.dashboardSchema = null;
        DatabaseClient.instance = this;
    }

    /**
     * @returns {DatabaseClient}
     */
    static getInstance() {
        if (!DatabaseClient.instance) {
            throw new Error("Database client not initialized");
        }
        return DatabaseClient.instance;
    }

    async connect() {
        try {
            await mongoose.connect(this.options.mongoUri);

            // Load schemas
            this.configSchema = require("./schemas/Config");
            this.dashboardSchema = require("./schemas/Dashboard");
            this.settingsSchema = require("./schemas/Settings");

            this.redis = new Redis(this.options.redisUri);

            this.redis.on("error", (error) => {
                console.error("Redis connection error:", error);
            });
        } catch (error) {
            console.error("Database connection error:", error);
            throw error;
        }
    }

    getMongoClient() {
        return mongoose.connection.getClient();
    }

    getDatabaseName() {
        return mongoose.connection.db?.databaseName;
    }

    getConnection() {
        return mongoose.connection;
    }

    async registerGuild(guild) {
        await this.settingsSchema.updateOne(
            {
                _id: guild.id,
            },
            { $set: { _id: guild.id, guild_name: guild.name, joined_at: guild.joinedAt } },
            { upsert: true },
        );
    }

    async leaveGuild(guild) {
        await this.settingsSchema.updateOne(
            {
                _id: guild.id,
            },
            {
                $set: {
                    _id: guild.id,
                    guild_name: guild.name,
                    joined_at: guild.joinedAt,
                    left_at: new Date(),
                },
            },
            { upsert: true },
        );
    }

    async registerPluginSettings(pluginName, pluginSettings) {
        if (!pluginName || typeof pluginName !== "string") {
            throw new Error("Plugin name must be a string");
        }

        this.settingsSchema.schema.add({
            [`plugins.${pluginName}`]: pluginSettings,
        });

        return true;
    }

    async registerSchema(schemaName, schema) {
        const schemaModel = mongoose.model(schemaName, schema);
        return schemaModel;
    }

    async getPluginSettings(guildId, pluginName) {
        const cacheKey = `settings:${guildId}:${pluginName}`;

        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const settings = await this.settingsSchema
            .findOne({ _id: guildId })
            .lean({ defaults: true });

        const pluginSettings = settings?.plugins?.[pluginName] || {};

        await this.redis.set(cacheKey, JSON.stringify(pluginSettings), "EX", 3600);
        return pluginSettings;
    }

    async updatePluginSettings(guildId, pluginName, settings) {
        const cacheKey = `settings:${guildId}:${pluginName}`;

        await mongoose
            .model("settings")
            .updateOne(
                { _id: guildId },
                { $set: { [`plugins.${pluginName}`]: settings } },
                { upsert: true },
            );

        await this.redis.set(cacheKey, JSON.stringify(settings), "EX", 3600);
    }

    async getPluginConfig(pluginName) {
        const cacheKey = `config:${pluginName}`;

        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const config = await this.configSchema
            .findOne({ _id: pluginName })
            .lean({ defaults: true });

        const pluginConfig = config?.config || {};

        await this.redis.set(cacheKey, JSON.stringify(pluginConfig), "EX", 3600);
        return pluginConfig;
    }

    async updatePluginConfig(pluginName, config) {
        const cacheKey = `config:${pluginName}`;
        await this.configSchema.updateOne({ _id: pluginName }, { config }, { upsert: true });
        await this.redis.set(cacheKey, JSON.stringify(config), "EX", 3600);
    }

    async getDashboardConfig(userId) {
        const cacheKey = "dashboard:config";

        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        let dash = await this.dashboardSchema.findById(userId).lean();
        this.redis.set(cacheKey, JSON.stringify(dash), "EX", 3600);
        return dash;
    }

    async dashboardLogin(userId, tokens) {
        await this.dashboardSchema.updateOne(
            { _id: userId },
            { $set: { logged_in: true, tokens } },
            { upsert: true },
        );
        await this.redis.del("dashboard:config");
    }

    async dashboardLogout(userId) {
        await this.dashboardSchema.updateOne(
            { _id: userId },
            { $set: { logged_in: false } },
            { upsert: true },
        );
        await this.redis.del("dashboard:config");
    }

    async dashboardLocale(userId, locale) {
        await this.dashboardSchema.updateOne(
            { _id: userId },
            { $set: { locale } },
            { upsert: true },
        );
        await this.redis.del("dashboard:config");
    }

    async addToCache(key, value, ttl = 3600) {
        await this.redis.set(key, JSON.stringify(value), "EX", ttl);
    }

    async getFromCache(key) {
        return this.redis.get(key);
    }

    async disconnect() {
        await mongoose.disconnect();
        await this.redis.quit();
    }
}

module.exports = DatabaseClient;
