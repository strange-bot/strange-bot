import { Schema, Model, Document, Connection, mongo } from "mongoose";
import { Redis } from "ioredis";

interface DatabaseOptions {
    mongoUri: string;
    redisUri: string;
    emitRedisErrors?: boolean; // Optional property added to match implementation
}

declare class DatabaseClient {
    private options: DatabaseOptions;
    private redis: Redis | null;
    private models: Map<string, Model<any>>;
    private static instance: DatabaseClient | null;

    /**
     * Creates an instance of DatabaseClient.
     * @throws {Error} If MongoDB and Redis URIs are not provided.
     */
    constructor(options: DatabaseOptions);

    /**
     * Gets the singleton instance of the DatabaseClient.
     * @throws {Error} If the database client is not initialized.
     */
    static getInstance(): DatabaseClient;

    /**
     * Connects to MongoDB and Redis.
     * @throws {Error} If there is a connection error.
     */
    connect(): Promise<void>;

    /**
     * Gets the MongoDB client.
     * @returns {mongo.MongoClient} The MongoDB client instance.
     */
    getMongoClient(): mongo.MongoClient;

    /**
     * Gets the name of the MongoDB database.
     */
    getDatabaseName(): string;

    /**
     * Gets the MongoDB connection.
     */
    getConnection(): Connection;

    /**
     * Registers a model in the database with cache support.
     */
    registerSchema<T>(name: string, schema: Schema): Model<T>;

    /**
     * Deletes a model from the database.
     */
    deleteModel(name: string): void;

    /**
     * Reloads a model in the database with cache support.
     */
    reloadSchema<T>(name: string, schema: Schema): Model<T>;

    /**
     * Gets a model from the database.
     * @param {string} name The name of the model.
     * @throws {Error} If the model is not found.
     */
    getModel<T>(name: string): Model<T>;

    /**
     * Registers plugin settings in the schema.
     * @param {string} pluginName The name of the plugin.
     * @param {object} pluginSettings The settings to register.
     * @throws {Error} If the plugin name is not a string.
     */
    registerPluginSettings(pluginName: string, pluginSettings: object): Promise<boolean>;

    /**
     * Adds a value to the cache.
     * @param {string} key The key to store the value under.
     * @param {unknown} value The value to store.
     * @param {number} [ttl] The time-to-live in seconds.
     */
    addToCache(key: string, value: unknown, ttl?: number): Promise<void>;

    /**
     * Gets a value from the cache.
     * @param {string} key The key to get the value from.
     * @param {number} [ttl] The time-to-live in seconds. This is used to refresh the cache.
     * @returns {Promise<any | undefined>} The cached value or undefined if not found.
     */
    getFromCache(key: string, ttl?: number): Promise<any | undefined>;

    /**
     * Removes a value from the cache.
     * @param {string} key The key to remove the value from.
     */
    deleteFromCache(key: string): Promise<void>;

    /**
     * Disconnects from MongoDB and Redis.
     */
    disconnect(): Promise<void>;
}

export { DatabaseClient as DBClient };
export { Schema, SchemaTypes, Document, Model };
