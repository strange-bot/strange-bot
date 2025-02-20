import { Schema, Model, DBClient } from "strange-db-client";
import { Config } from "./Config";
import { Guild } from "discord.js";

declare class DBService {
    protected readonly name: string;
    protected readonly schemas: Map<string, Schema>;
    protected readonly config: Config;
    protected dbClient: DBClient;

    /**
     * @param pluginName Unique name of the plugin
     */
    constructor(pluginName: string);

    /**
     * Initializes the service and registers schemas
     * @param dbClient Database client instance
     * @param config Configuration object
     */
    init(dbClient?: DBClient, config?: Config): Promise<void>;

    /**
     * Override this method to define schemas for your service
     * @param config Current configuration
     */
    defineSchemas(config: Config): Record<string, Schema>;

    /**
     * Gets a registered model by name
     * @param schemaName Name of the schema
     */
    getModel(schemaName: string): Model<any>;

    /**
     * Gets settings for a guild
     * @param guild Guild or guild ID
     */
    getSettings(guild: GuildLike | string): Promise<Model>;

    /**
     * Adds a value to cache
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Time to live in seconds
     */
    cache(key: string, value: string | object, ttl?: number): Promise<void>;

    /**
     * Gets a value from cache
     * @param key Cache key
     * @param ttl Optional TTL override
     */
    getCache(key: string, ttl?: number): Promise<any>;

    /**
     * Removes a value from cache
     * @param key Cache key
     */
    delCache(key: string): Promise<void>;
}

export { DBService };
