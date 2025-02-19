import { Router } from "express";
import { Guild } from "discord.js";
import { DBClient } from "strange-db-client";
import { SaveableConfig } from "./Config";
import { DBService } from "./DBService";

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

    /**
     * Database service implementation for the plugin
     */
    dbService?: DBService;
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

    /** Database service instance */
    public readonly dbService: DBService;

    /** Plugin configuration manager */
    public readonly config: SaveableConfig;

    /** Database client instance if available */
    public readonly dbClient: DBClient | null;

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
    public getSettings(guild: Guild | string): Promise<object>;

    /**
     * Retrieves the plugin's configuration
     * @returns Configuration object with save method
     */
    public getConfig(): Promise<SaveableConfig>;

    private static validate(data: PluginData): void;
}

export { DashboardPlugin };
