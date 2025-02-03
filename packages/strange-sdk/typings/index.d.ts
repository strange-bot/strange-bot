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
     * The plugin name
     */
    name: string;

    /**
     * The plugin version
     */
    version: string;

    /**
     * The base directory of the plugin
     */
    baseDir: string;

    /**
     * The base directory of the plugin
     */
    pluginDir: string;

    /**
     * Whether the plugin is owner only
     */
    ownerOnly: boolean;

    /**
     * List of dependencies required by the plugin
     */
    dependencies: string[];

    /**
     * The init function to be executed when the plugin is loaded by the bot
     */
    init?: ((client: Client) => Promise<void>) | null;

    /**
     * The settings object
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

    /**
     * Registered schemas
     */
    schemas: Map<string, Model<any>>;

    /**
     * The event handlers
     */
    eventHandlers: Map<string, Function>;

    /**
     * The commands set
     */
    commands: Set<CommandType>;

    /**
     * The contexts set
     */
    contexts: Set<ContextType>;

    /**
     * The number of prefix commands
     */
    prefixCount: number;

    /**
     * The number of slash commands
     */
    slashCount: number;

    async load(): Promise<void>;
    async unload(): Promise<void>;
    async getSettings(guild: Guild | string): Promise<object>;
    async setSettings(guild: Guild | string, settings: object): Promise<void>;
    async getConfig(): Promise<Config>;
    async setConfig(config: object): Promise<void>;
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
     * The plugin name
     */
    name: string;

    /**
     * The plugin version
     */
    version: string;

    /**
     * The base directory of the plugin
     */
    baseDir: string;

    /**
     * Whether the plugin is enabled.
     */
    enabled: boolean;

    /**
     * Font-awesome icon class
     */
    icon: string;

    /**
     * The init function to be executed when the plugin is loaded by the dashboard
     */
    init?: ((client: Client) => Promise<void>) | null;

    /**
     * Express router for the settings page.
     */
    settingsRouter: Router | null;

    /**
     * Express router for the admin page.
     */
    adminRouter: Router | null;

    async load(): Promise<void>;
    async unload(): Promise<void>;
    async getSettings(guild: Guild | string): Promise<object>;
    async setSettings(guild: Guild | string, settings: object): Promise<void>;
    async getConfig(): Promise<Config>;
    async setConfig(config: object): Promise<void>;
}

export class Config {
    private data: Record<string, any>;
    private pluginName: string;

    constructor(pluginName: string, data: Record<string, any>);

    static fromDirectory(baseDir: string): Config;
    static fromObject(pluginName: string, data: Record<string, any>): Config;

    get(key: string): any;
    set(key: string, value: any): void;
    syncWithDb(): Promise<void>;
}

export interface Utils {
    BotUtils: import("../lib/utils/BotUtils");
    EmbedUtils: import("../lib/utils/EmbedUtils");
    HttpUtils: import("../lib/utils/HttpUtils");
    Logger: import("../lib/utils/Logger");
    MiscUtils: import("../lib/utils/MiscUtils");
    permissions: import("../lib/utils/permissions");
}

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
    messageRun(
        message: Message,
        args: string[],
        data: { prefix: string; invoke: string },
    ): Promise<any>;
    interactionRun(interaction: ChatInputCommandInteraction): Promise<any>;
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
    run(interaction: ContextMenuCommandInteraction): Promise<any>;
};
