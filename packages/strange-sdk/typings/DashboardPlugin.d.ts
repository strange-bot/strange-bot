import { Router } from "express";
import { Guild } from "discord.js";
import { Model, Document, Schema } from "mongoose";
import { DBClient } from "strange-db-client";
import { SaveableConfig } from "./Config";

interface PluginData {
    /**
     * Base directory for the plugin's dashboard-specific files
     * @example "/plugins/example/dashboard"
     */
    baseDir: string;

    /**
     * Whether the plugin's dashboard features are restricted to bot owners only
     * @default false
     */
    ownerOnly?: boolean;

    /**
     * FontAwesome icon class used in the dashboard UI
     * @default "fa-solid fa-puzzle-piece"
     */
    icon?: string;

    /**
     * Optional initialization function that runs when the plugin loads
     * Use this to set up plugin-specific resources or configurations
     */
    init?: () => Promise<void>;

    /**
     * Express router for the plugin's settings page
     */
    dashboardRouter?: Router;

    /**
     * Express router for the plugin's admin page
     */
    adminRouter?: Router;
}

declare class DashboardPlugin {
    /** Name of the plugin from package.json */
    public readonly name: string;

    /** Version of the plugin from package.json */
    public readonly version: string;

    /** Root directory of the plugin (contains package.json) */
    public readonly pluginDir: string;

    /** Base directory containing dashboard-specific files */
    public readonly baseDir: string;

    /** Whether the plugin is restricted to bot owners */
    public readonly ownerOnly: boolean;

    /** FontAwesome icon class used in dashboard UI */
    public readonly icon: string;

    /** Optional initialization function that runs when plugin loads */
    public readonly init: (() => Promise<void>) | null;

    /** Express router for plugin settings page */
    public readonly dashboardRouter: Router | null;

    /** Express router for plugin admin page */
    public readonly adminRouter: Router | null;

    /** Plugin configuration manager */
    public readonly config: SaveableConfig;

    /** Database client instance if available */
    public readonly dbClient?: DBClient;

    /** Map of registered MongoDB schemas */
    public readonly schemas: Map<string, Schema | ((config: SaveableConfig) => Schema)>;

    /**
     * Creates a new plugin instance
     * @param data Plugin initialization data
     * @throws {TypeError} If plugin data is invalid
     */
    constructor(data: PluginData);

    /**
     * Loads the plugin by registering events, commands, and schemas
     * @param dbClient Database client instance if available
     * @returns Promise that resolves when loading is complete
     */
    public load(dbClient?: DBClient): Promise<void>;

    /**
     * Unloads the plugin by clearing all registered handlers and commands
     * @returns Promise that resolves when unloading is complete
     */
    public unload(): Promise<void>;

    /**
     * Gets plugin settings for a specific guild
     * @param guild The guild or guild ID
     * @returns The guild-specific settings
     */
    public getSettings(guild: Guild | string): Promise<Document | null>;

    /**
     * Updates plugin settings for a specific guild
     * @param guild The guild or guild ID
     * @param settings New settings to apply
     */
    public updateSettings(guild: Guild | string, settings: any): Promise<void>;

    /**
     * Retrieves the plugin's configuration
     * @returns Configuration object with save method
     */
    public getConfig(): Promise<SaveableConfig>;

    /**
     * Updates the plugin's configuration
     * @param newConfig New configuration object
     */
    public setConfig(newConfig: any): Promise<void>;

    /**
     * Retrieves a registered MongoDB model by name
     * @param schema Name of the schema to get model for
     * @returns The mongoose model
     * @throws {Error} If model is not registered
     */
    public getModel(schema: string): Model<any>;

    /**
     * Reloads schemas with make use of config parameter
     * @returns Promise that resolves when unloading is complete
     */
    public reloadConfigSchemas(): Promise<void>;

    /**
     * Adds a value to the cache.
     * @param key The key to store the value under.
     * @param value The value to store.
     * @param [ttl] Time-to-live in seconds
     */
    public cache(key: string, value: string, ttl?: number): void;

    /**
     * Gets a value from the cache.
     * @param key The key to get the value from.
     * @param ttl The time-to-live in seconds. This is used to refresh the cache.
     * @returns The cached value or null if not found
     */
    getFromCache(key: string, ttl?: number): string | null;

    private registerSchemas(): Promise<void>;
    private static validate(data: PluginData): void;
    private static validateSchema(schema: Schema): void;
}

export { DashboardPlugin };
