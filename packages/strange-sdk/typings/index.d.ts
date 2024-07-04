import { Model } from "mongoose";
import { Router } from "express";
import {
    Message,
    ApplicationCommandOptionData,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    PermissionResolvable,
    ContextMenuCommandInteraction,
} from "discord.js";

type DashboardData = {
    /**
     * Whether the dashboard is enabled or not
     */
    enabled: boolean;
    /**
     * Express router for the settings page.
     */
    settingsRouter: Router;
    /**
     * Express router for the admin page.
     */
    adminRouter: Router;
};

type PluginData = {
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
     * List of events to listen to
     */
    events?: string[];
    /**
     * The init function to be executed when the plugin is loaded
     */
    init?: Function | null;
    /**
     * The settings object
     */
    settings?: object | null;
    /**
     * The dashboard data
     */
    dashboard?: DashboardData | null;
};

export class Plugin {
    constructor(data: PluginData, _load?: boolean);
    /**
     * The plugin name
     */
    name: string;

    /**
     * The plugin version
     */
    version: string;

    /**
     * Font-awesome icon class
     */
    icon: string;

    /**
     * The base directory of the plugin
     */
    baseDir: string;

    /**
     * The plugin name
     */
    ownerOnly: boolean;

    /**
     * List of dependencies required by the plugin
     */
    dependencies: string[];

    /**
     * List of events to listen to
     */
    events: string[];

    /**
     * The init function to be executed when the plugin is loaded
     */
    init: Function | null;

    /**
     * The settings object
     */
    settings: object | null;

    /**
     * The dashboard data
     */
    dashboard: DashboardData | null;

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

    load(): void;
    unload(): void;
}

export class Config<T> {
    /**
     * @param baseDir The base directory of the plugin
     * @param data The data object
     */
    constructor(baseDir: string, data: T);

    /**
     * The plugin name
     */
    pluginName: string;

    /**
     * The plugin version
     */
    pluginVersion: string;

    /**
     * Represents mongoose model if the data is stored in a database
     */
    model: Model | null;

    /**
     * The data object
     */
    data: T;

    /**
     * Get the value of a key
     * @param key The key to get the value of
     */
    get<K extends keyof T>(key: K): T[K];

    /**
     * Set the value of a key
     * @param key The key to set the value of
     * @param value The value to set
     */
    set<K extends keyof T>(key: K, value: T[K]): void;

    /**
     * Save the data to the database
     */
    async saveToDb(): Promise<void>;

    /**
     * Load the data from the database
     * @param model The mongoose model to load the data from
     */
    async loadFromDb(model: Model): Promise<void>;
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

    plugin: Plugin | undefined;
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
