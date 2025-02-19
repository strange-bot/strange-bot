const mongoose = require("mongoose");
const mongooseLeanDefaults = require("mongoose-lean-defaults").default;
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
        this.models = new Map();
        DatabaseClient.instance = this;
    }

    static getInstance() {
        if (!DatabaseClient.instance) {
            throw new Error("Database client not initialized");
        }
        return DatabaseClient.instance;
    }

    async connect() {
        try {
            await mongoose.connect(this.options.mongoUri);
            this.redis = new Redis(`${this.options.redisUri}?keyPrefix=strange:`);
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

    registerSchema(name, schema) {
        schema.plugin(mongooseLeanDefaults);
        const model = mongoose.model(name, schema);
        this.models.set(name, model);
        return model;
    }

    reloadSchema(name, schema) {
        if (!mongoose.models[name] || !this.models.has(name)) {
            throw new Error(`Model with name ${name} is not registered`);
        }
        delete mongoose.models[name];
        this.models.delete(name);
        return this.registerSchema(name, schema);
    }

    getModel(name) {
        if (this.models?.has(name)) {
            return this.models.get(name);
        }
        throw new Error(`Model ${name} not found`);
    }

    async addToCache(key, value, ttl = 60) {
        const serializedValue = typeof value === "object" ? JSON.stringify(value) : value;
        if (ttl === 0) {
            await this.redis.set(key, serializedValue);
        } else {
            await this.redis.set(key, serializedValue, "EX", ttl);
        }
    }

    async getFromCache(key, ttl = 0) {
        const value = await this.redis.get(key);
        if (value === null) return undefined;
        if (ttl !== 0) await this.redis.expire(key, ttl);
        return value;
    }

    async disconnect() {
        await mongoose.disconnect();
        await this.redis.quit();
    }
}

module.exports = {
    DBClient: DatabaseClient,
    Schema: mongoose.Schema,
    SchemaTypes: mongoose.Schema.Types,
    Model: mongoose.Model,
    Document: mongoose.Document,
};
