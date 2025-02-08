const mongoose = require("mongoose");
const Redis = require("ioredis");

class DatabaseClient {
    static instance = null;

    /**
     * Creates an instance of DatabaseClient.
     * @param {object} options - The options for the database client.
     * @param {string} options.mongoUri - The MongoDB URI.
     * @param {string} options.redisUri - The Redis URI.
     * @throws {Error} If MongoDB and Redis URIs are not provided.
     */
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
     * Gets the singleton instance of the DatabaseClient.
     * @returns {DatabaseClient} The singleton instance.
     * @throws {Error} If the database client is not initialized.
     */
    static getInstance() {
        if (!DatabaseClient.instance) {
            throw new Error("Database client not initialized");
        }
        return DatabaseClient.instance;
    }

    /**
     * Connects to MongoDB and Redis.
     * @returns {Promise<void>}
     * @throws {Error} If there is a connection error.
     */
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

    /**
     * Gets the MongoDB client.
     * @returns {mongoose.Client} The MongoDB client.
     */
    getMongoClient() {
        return mongoose.connection.getClient();
    }

    /**
     * Gets the name of the MongoDB database.
     * @returns {string} The database name.
     */
    getDatabaseName() {
        return mongoose.connection.db?.databaseName;
    }

    /**
     * Gets the MongoDB connection.
     * @returns {mongoose.Connection} The MongoDB connection.
     */
    getConnection() {
        return mongoose.connection;
    }

    /**
     * Registers a guild in the database.
     * @param {object} guild - The guild object.
     * @param {string} guild.id - The guild ID.
     * @param {string} guild.name - The guild name.
     * @param {Date} guild.joinedAt - The date the guild joined.
     * @returns {Promise<void>}
     */
    async registerGuild(guild) {
        await this.settingsSchema.updateOne(
            {
                _id: guild.id,
            },
            { $set: { _id: guild.id, guild_name: guild.name, joined_at: guild.joinedAt } },
            { upsert: true },
        );
    }

    /**
     * Marks a guild as left in the database.
     * @param {object} guild - The guild object.
     * @param {string} guild.id - The guild ID.
     * @param {string} guild.name - The guild name.
     * @param {Date} guild.joinedAt - The date the guild joined.
     * @returns {Promise<void>}
     */
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

    /**
     * Registers plugin settings in the schema.
     * @param {string} pluginName - The name of the plugin.
     * @param {object} pluginSettings - The settings of the plugin.
     * @returns {Promise<boolean>} True if the settings are registered.
     * @throws {Error} If the plugin name is not a string.
     */
    async registerPluginSettings(pluginName, pluginSettings) {
        if (!pluginName || typeof pluginName !== "string") {
            throw new Error("Plugin name must be a string");
        }

        this.settingsSchema.schema.add({
            [`plugins.${pluginName}`]: pluginSettings,
        });

        return true;
    }

    /**
     * Registers a schema in the database.
     * @param {string} schemaName - The name of the schema.
     * @param {mongoose.Schema} schema - The schema object.
     * @returns {Promise<mongoose.Model>} The registered schema model.
     */
    async registerSchema(schemaName, schema) {
        const schemaModel = mongoose.model(schemaName, schema);
        return schemaModel;
    }

    /**
     * Gets the settings for a guild.
     * @param {string} guildId - The ID of the guild.
     * @returns {Promise<object>} The settings object.
     */
    async getSettings(guildId) {
        let settings = await this.settingsSchema.findById(guildId).lean({ defaults: true });
        if (!settings) {
            settings = new this.settingsSchema({
                _id: guildId,
            })._doc;
        }
        return settings;
    }

    /**
     * Gets the plugin settings for a guild.
     * @param {string} guildId - The ID of the guild.
     * @param {string} pluginName - The name of the plugin.
     * @returns {Promise<object>} The plugin settings object.
     */
    async getPluginSettings(guildId, pluginName) {
        const cacheKey = `settings:${guildId}:${pluginName}`;

        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        let settings = await this.settingsSchema.findById(guildId).lean({ defaults: true });
        if (!settings) {
            settings = new this.settingsSchema({
                _id: guildId,
            });
        }

        const pluginSettings = settings?.plugins?.[pluginName];

        await this.redis.set(cacheKey, JSON.stringify(pluginSettings), "EX", 3600);
        return pluginSettings;
    }

    /**
     * Updates the plugin settings for a guild.
     * @param {string} guildId - The ID of the guild.
     * @param {string} pluginName - The name of the plugin.
     * @param {object} settings - The settings object.
     * @returns {Promise<void>}
     */
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

    /**
     * Gets the configuration for a plugin.
     * @param {string} pluginName - The name of the plugin.
     * @returns {Promise<object>} The plugin configuration object.
     */
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

    /**
     * Updates the configuration for a plugin.
     * @param {string} pluginName - The name of the plugin.
     * @param {object} config - The configuration object.
     * @returns {Promise<void>}
     */
    async updatePluginConfig(pluginName, config) {
        const cacheKey = `config:${pluginName}`;
        await this.configSchema.updateOne({ _id: pluginName }, { config }, { upsert: true });
        await this.redis.set(cacheKey, JSON.stringify(config), "EX", 3600);
    }

    /**
     * Gets the dashboard configuration for a user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<object>} The dashboard configuration object.
     */
    async getDashboardConfig(userId) {
        const cacheKey = "dashboard:config";

        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        let dash = await this.dashboardSchema.findById(userId).lean();
        this.redis.set(cacheKey, JSON.stringify(dash), "EX", 3600);
        return dash;
    }

    /**
     * Logs in a user to the dashboard.
     * @param {string} userId - The ID of the user.
     * @param {object} tokens - The tokens object.
     * @returns {Promise<void>}
     */
    async dashboardLogin(userId, tokens) {
        await this.dashboardSchema.updateOne(
            { _id: userId },
            { $set: { logged_in: true, tokens } },
            { upsert: true },
        );
        await this.redis.del("dashboard:config");
    }

    /**
     * Logs out a user from the dashboard.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<void>}
     */
    async dashboardLogout(userId) {
        await this.dashboardSchema.updateOne(
            { _id: userId },
            { $set: { logged_in: false } },
            { upsert: true },
        );
        await this.redis.del("dashboard:config");
    }

    /**
     * Updates the locale for a user in the dashboard.
     * @param {string} userId - The ID of the user.
     * @param {string} locale - The locale string.
     * @returns {Promise<void>}
     */
    async dashboardLocale(userId, locale) {
        await this.dashboardSchema.updateOne(
            { _id: userId },
            { $set: { locale } },
            { upsert: true },
        );
        await this.redis.del("dashboard:config");
    }

    /**
     * Adds a value to the cache.
     * @param {string} key - The cache key.
     * @param {object} value - The value to cache.
     * @param {number} [ttl=3600] - The time-to-live in seconds.
     * @returns {Promise<void>}
     */
    async addToCache(key, value, ttl = 3600) {
        const v = typeof value === "object" ? JSON.stringify(value) : value;
        await this.redis.set(key, v, "EX", ttl);
    }

    /**
     * Gets a value from the cache.
     * @param {string} key - The cache key.
     * @returns {Promise<object>} The cached value.
     */
    async getFromCache(key) {
        return this.redis.get(key);
    }

    /**
     * Disconnects from MongoDB and Redis.
     * @returns {Promise<void>}
     */
    async disconnect() {
        await mongoose.disconnect();
        await this.redis.quit();
    }
}

module.exports = DatabaseClient;
