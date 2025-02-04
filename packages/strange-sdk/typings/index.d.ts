import { Router } from "express";
import { Model } from "mongoose";
import {
    Guild,
    Message,
    ApplicationCommandOptionData,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    PermissionResolvable,
    ContextMenuCommandInteraction,
    Client,
} from "discord.js";

type BotPluginData = {
    /**
     * The base directory of the plugin
     */
    baseDir: string;
    /**
     * Whether the plugin is owner only or not
     */
    ownerOnly?: boolean;
    /**
     * List of dependencies required by the plugin
     */
    dependencies?: string[];
    /**
     * The init function to be executed when the plugin is loaded
     */
    init?: ((client: Client) => Promise<void>) | null;
    /**
     * Function to register MongoDB schemas for the plugin
     */
    registerSchemas?: ((config: object) => object) | null;

    /**
     * The IPC configuration
     */
    ipcHandler?: {
        [key: string]: (
            message: any,
            client: Client,
        ) => Promise<{
            success: boolean;
            data?: any;
            error?: string;
        }>;
    };
};

export class BotPlugin {
    constructor(data: BotPluginData);
    /**
     * The plugin name from package.json
     */
    name: string;

    /**
     * The plugin version from package.json
     */
    version: string;

    /**
     * The directry containing bot Plugin
     */
    baseDir: string;

    /**
     * The base directory of the plugin
     */
    pluginDir: string;

    /**
     * Whether the plugin is restricted to bot owners only
     */
    ownerOnly: boolean;

    /**
     * List of plugin dependencies
     */
    dependencies: string[];

    /**
     * Function called when plugin is loaded by the bot
     */
    init?: ((client: Client) => Promise<void>) | null;

    /**
     * Function to register MongoDB schemas
     */
    registerSchemas?: ((config: object) => object) | null;

    /**
     * IPC message handlers
     */
    ipcHandler?: {
        [key: string]: (
            message: any,
            client: Client,
        ) => Promise<{
            success: boolean;
            data?: any;
            error?: string;
        }>;
    };

    /**
     * Map of registered MongoDB models
     */
    models: Map<string, Model<any>>;

    /**
     * Map of registered event handlers
     */
    eventHandlers: Map<string, Function>;

    /**
     * Set of registered bot commands
     */
    commands: Set<CommandType>;

    /**
     * Set of registered context menu commands
     */
    contexts: Set<ContextType>;

    /**
     * Number of registered prefix commands
     */
    prefixCount: number;

    /**
     * Number of registered slash commands
     */
    slashCount: number;

    /**
     * Loads the plugin by registering events, commands and schemas
     */
    async load(): Promise<void>;

    /**
     * Unloads the plugin by clearing registered handlers and commands
     */
    async unload(): Promise<void>;

    /**
     * Gets the plugin configuration
     * @returns {Promise<object>} The plugin configuration object
     */
    async getConfig(): Promise<object>;

    /**
     * Updates the plugin configuration
     * @param {object} config - The new configuration object
     */
    async setConfig(config: object): Promise<void>;

    /**
     * Gets a registered MongoDB model by name
     * @param {string} name - The model name
     * @returns {Promise<Model<any>>} The mongoose model
     */
    async getModel(name: string): Promise<Model<any>>;
}

type DashboardPluginData = {
    /**
     * The base directory of the plugin
     */
    baseDir: string;
    /**
     * Whether the plugin is enabled.
     */
    enabled?: boolean;
    /**
     * Font-awesome icon class
     */
    icon?: string;
    /**
     * The init function to be executed when the plugin is loaded
     */
    init?: (() => Promise<void>) | null;
    /**
     * Express router for the settings page.
     */
    settingsRouter?: Router;
    /**
     * Express router for the admin page.
     */
    adminRouter?: Router;
};

export class DashboardPlugin {
    constructor(data: DashboardPluginData);
    /**
     * The plugin name from package.json
     */
    name: string;

    /**
     * The plugin version from package.json
     */
    version: string;

    /**
     * The base directory containing the plugin code
     */
    baseDir: string;

    /**
     * Whether the plugin is enabled
     * @default true
     */
    enabled: boolean;

    /**
     * Font-awesome icon class for the plugin
     * @default "fa-solid fa-puzzle-piece"
     */
    icon: string;

    /**
     * Function called when plugin is loaded by the dashboard
     */
    init?: (() => Promise<void>) | null;

    /**
     * Express router for the plugin settings page
     */
    settingsRouter: Router | null;

    /**
     * Express router for the plugin admin page
     */
    adminRouter: Router | null;

    /**
     * Loads the plugin
     */
    async load(): Promise<void>;

    /**
     * Unloads the plugin
     */
    async unload(): Promise<void>;

    /**
     * Gets the plugin settings for a guild
     * @param {Guild|string} guild - The guild or guild ID
     * @returns {Promise<object>} The plugin settings
     */
    async getSettings(guild: Guild | string): Promise<object>;

    /**
     * Updates the plugin settings for a guild
     * @param {Guild|string} guild - The guild or guild ID
     * @param {object} settings - The new settings
     */
    async setSettings(guild: Guild | string, settings: object): Promise<void>;

    /**
     * Gets the plugin configuration
     * @returns {Promise<object>} The plugin configuration
     */
    async getConfig(): Promise<object>;

    /**
     * Updates the plugin configuration
     * @param {object} config - The new configuration
     */
    async setConfig(config: object): Promise<void>;
}

export class PluginConfig {
    /**
     * Reads and parses the config.json file from the specified directory
     * @param {string} baseDir - The base directory containing the config.json file
     * @returns {object} The parsed configuration object
     */
    static fromDirectory(baseDir: string): object;

    /**
     * Synchronizes the plugin configuration with the database
     * @param {string} pluginName - The name of the plugin
     * @param {object} data - The configuration data to sync
     * @returns {Promise<object>} The merged configuration object
     */
    static syncWithDb(pluginName: string, data: object): Promise<object>;
}

export interface Utils {
    /**
     * Utility functions for bot-related operations
     */
    BotUtils: import("../lib/utils/BotUtils");
    
    /**
     * Utility functions for creating and managing Discord embeds
     */
    EmbedUtils: import("../lib/utils/EmbedUtils");
    
    /**
     * Utility functions for making HTTP requests
     */
    HttpUtils: import("../lib/utils/HttpUtils");
    
    /**
     * Logger utility for consistent logging across the application
     */
    Logger: import("../lib/utils/Logger");
    
    /**
     * Miscellaneous utility functions
     */
    MiscUtils: import("../lib/utils/MiscUtils");
    
    /**
     * Discord permission utility functions
     */
    permissions: import("../lib/utils/permissions");
}

export type CommandContext = {
    message: Message;
    prefix: string;
    invoke: string;
    args: string[];
    plugin: BotPlugin;
    settings: Record<string, any>;
    config: Record<string, any>;
};

export type ChatInputCommandInteractionContext = {
    interaction: ChatInputCommandInteraction;
    plugin: BotPlugin;
    settings: Record<string, any>;
    config: Record<string, any>;
};

export type CommandType = {
    /**
     * The name of the command
     */
    name: string;
    /**
     * A short description of the command
     */
    description: string;
    /**
     * Whether the command is enabled or not
     */
    enabled: boolean;
    /**
     * The command cooldown in seconds (0 for no cooldown)
     */
    cooldown?: number;
    /**
     * Permissions required by the client to use the command.
     */
    botPermissions?: PermissionResolvable[];
    /**
     * Permissions required by the user to use the command
     */
    userPermissions?: PermissionResolvable[];
    /**
     * List of validation functions to run before executing the command
     */
    validations?: {
        /**
         * The validation function
         */
        callback: (message: Message | ChatInputCommandInteraction) => boolean;
        /**
         * The error message to send if the validation fails
         */
        message: string;
    }[];
    /**
     * Prefix command properties
     */
    command: {
        /**
         * Whether the prefix command is enabled or not
         */
        enabled: boolean;
        /**
         * Alternative names for the command (all must be lowercase)
         */
        aliases?: string[];
        /**
         * The command usage format string
         */
        usage?: string;
        /**
         * Minimum number of arguments the command takes (default is 0)
         */
        minArgsCount: number;
        /**
         * List of subcommands
         */
        subcommands: {
            /**
             * The name of the subcommand
             */
            trigger: string;
            /**
             * A short description of the subcommand
             */
            description: string;
        }[];
    };
    /**
     * Slash command properties
     */
    slashCommand: {
        /**
         * Whether the slash command is enabled or not
         */
        enabled: boolean;
        /**
         * Whether the reply should be ephemeral
         */
        ephemeral?: boolean;
        /**
         * The command options
         */
        options: ApplicationCommandOptionData[];
    };

    plugin?: BotPlugin;
    messageRun(ctx: CommandContext): Promise<any>;
    interactionRun(ctx: ChatInputCommandInteractionContext): Promise<any>;
};

export type ContextMenuCommandInteractionContext = {
    interaction: ContextMenuCommandInteraction;
    plugin: BotPlugin;
    settings: Record<string, any>;
    config: Record<string, any>;
};

export type ContextType = {
    /**
     * The name of the context
     */
    name: string;
    /**
     * A short description of the context
     */
    description: string;
    /**
     * The type of application command
     */
    type: ApplicationCommandType;
    /**
     * Whether the context is enabled or not
     */
    enabled?: boolean;
    /**
     * Whether the reply should be ephemeral
     */
    ephemeral?: boolean;
    /**
     * Permissions required by the user to use the command.
     */
    userPermissions?: PermissionResolvable[];
    /**
     * Command cooldown in seconds
     */
    cooldown?: number;
    /**
     * The callback to be executed when the context is invoked
     */
    run(ctx: ContextMenuCommandInteractionContext): Promise<any>;
};
