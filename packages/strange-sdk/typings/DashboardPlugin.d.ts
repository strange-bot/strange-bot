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

    /**
     * Called when the plugin is enabled
     * Use this to set up plugin-specific resources or configurations
     */
    onEnable?: () => Promise<void>;
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

    /** Express router for plugin settings page */
    public readonly dashboardRouter: Router | null;

    /** Express router for plugin admin page */
    public readonly adminRouter: Router | null;

    /** Database service instance */
    public readonly dbService: DBService | null;

    /** Optional initialization function that runs when plugin loads */
    public readonly onEnable: (() => Promise<void>) | null;

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
     * Loads the plugin by registering routes, schemas and other resources
     * @param dbClient Database client instance if available
     * @returns Promise that resolves when loading is complete
     */
    public enable(dbClient?: DBClient): Promise<void>;

    /**
     * Unloads the plugin by removing routes, schemas and other resources
     * @returns Promise that resolves when unloading is complete
     */
    public disable(): Promise<void>;

    /**
     * Retrieves the plugin's configuration
     * @returns Configuration object with save method
     */
    public getConfig(): Promise<SaveableConfig>;

    private static validate(data: PluginData): void;
}

export { DashboardPlugin };
