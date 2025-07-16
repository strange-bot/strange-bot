import {
    Client,
    Guild,
    Events,
    ApplicationCommandType,
    PermissionResolvable,
    ChatInputCommandInteraction,
    Message,
    ApplicationCommandOptionData,
    ContextMenuCommandInteraction,
} from "discord.js";
import { DBClient, Model, Schema, Document } from "strange-db-client";
import { Config, SaveableConfig } from "./Config";
import { DBService } from "./DBService";


interface PluginData {
    /**
     * Base directory for the plugin's bot-specific files
     * Usually points to the 'bot' directory containing commands, events, etc.
     * @example "/plugins/example/bot"
     */
    baseDir: string;

    /**
     * Whether the plugin's commands are restricted to bot owners only
     * @default false
     */
    ownerOnly?: boolean;

    /**
     * Array of plugin names that this plugin depends on
     * These plugins must be loaded before this one can initialize
     * @example ["moderation", "logging"]
     */
    dependencies?: string[];

    /**
     * Database service implementation for the plugin
     * This is used to manage plugin-specific database schemas and settings
     */
    dbService?: DBService;

    /**
     * Called when the plugin is enabled
     * Use this to set up plugin-specific resources or configurations
     * @param client - The Discord.js client instance
     */
    onEnable?: (client: Client) => Promise<void>;

    /**
     * Called when the plugin is disabled
     * Use this to clean up resources and unregister event listeners
     */
    onDisable?: () => Promise<void>;

    /**
     * Called when the plugin is enabled for a guild
     * Use this to start any services or register event listeners
     * @param guild - The guild where the plugin is enabled
     */
    onGuildEnable?: (guild: Guild) => Promise<any>;

    /**
     * Called when the plugin is disabled
     * Use this to clean up resources and unregister event listeners
     * @param guild - The guild where the plugin is disabled
     */
    onGuildDisable?: (guild: Guild) => Promise<void>;
}

declare class BotPlugin {
    /** Name of the plugin from package.json */
    public readonly name: string;

    /** Version of the plugin from package.json */
    public readonly version: string;

    /** Root directory of the plugin (contains package.json) */
    public readonly pluginDir: string;

    /** Base directory containing bot-specific files (commands, events, etc.) */
    public readonly baseDir: string;

    /** Whether the plugin is restricted to bot owners */
    public readonly ownerOnly: boolean;

    /** List of other plugins this plugin depends on */
    public readonly dependencies: string[];

    /** Optional function that runs when plugin is enabled */
    public readonly onEnable: ((client: Client) => Promise<void>) | null;

    /** Optional function that runs when plugin is disabled */
    public readonly onDisable: (() => Promise<void>) | null;

    /** Optional function that runs when plugin is enabled for a guild */
    public readonly onGuildEnable: ((guild: Guild) => Promise<void>) | null;

    /** Optional function that runs when plugin is disabled for a guild */
    public readonly onGuildDisable: ((guild: Guild) => Promise<void>) | null;

    /** Database service instance */
    public readonly dbService: DBService | null;

    /** Map of Discord.js event handlers */
    public readonly eventHandlers: Map<keyof typeof Events, Function>;

    /** Set of registered commands */
    public readonly commands: Set<CommandType>;

    /** Set of registered context menu commands */
    public readonly contexts: Set<ContextType>;

    /** Number of enabled prefix commands */
    public readonly prefixCount: number;

    /** Number of enabled slash commands */
    public readonly slashCount: number;

    /** Number of enabled user context menu commands */
    public readonly userContextsCount: number;

    /** Number of enabled message context menu commands */
    public readonly messageContextsCount: number;

    /** Plugin configuration manager */
    public readonly config: Config;

    /**
     * Creates a new plugin instance
     * @param data Plugin initialization data
     * @throws {TypeError} If plugin data is invalid
     */
    constructor(data: PluginData);

    /**
     * Loads the plugin by registering events, commands, and schemas
     * @param botClient Discord.js client instance
     * @param dbClient Database client instance if available
     * @returns Promise that resolves when loading is complete
     */
    public enable(botClient: Client, dbClient: DBClient): Promise<void>;

    /**
     * Unloads the plugin by unregistering events, commands, and schemas
     * @param botClient Discord.js client instance
     * @returns Promise that resolves when unloading is complete
     */
    public disable(botClient: Client): Promise<void>;

    /**
     * Retrieves the plugin's configuration
     * @returns Configuration object with save method
     */
    public getConfig(): Promise<SaveableConfig>;

    private loadEvents(): void;
    private loadCommands(): void;
    private loadContexts(): void;
    private static validate(data: PluginData): void;
    private static validateSchema(schema: Schema): void;
    private static validateCommand(cmd: CommandType): void;
    private static validateContext(context: ContextType): void;
}

interface ValidationRule {
    /** The validation function */
    callback: (message: Message) => boolean;
    /** The error message to send if the validation fails */
    message: string;
}

interface CommandContext {
    message: Message;
    prefix: string;
    invoke: string;
    args: string[];
}

interface ChatInputCommandInteractionContext {
    interaction: ChatInputCommandInteraction;
}

interface CommandType {
    /** The name of the command */
    name: string;

    /** A short description of the command */
    description: string;

    /** Whether the command is enabled or not (default is true) */
    enabled?: boolean;

    /** The command cooldown in seconds (0 for no cooldown) */
    cooldown?: number;

    /** Permissions required by the client to use the command */
    botPermissions?: PermissionResolvable[];

    /** Permissions required by the user to use the command */
    userPermissions?: PermissionResolvable[];

    /** List of validation functions to run before executing the command */
    validations?: ValidationRule[];

    /** Prefix command properties */
    command: {
        /** Whether the prefix command is enabled or not */
        enabled: boolean;
        /** Alternative names for the command (all must be lowercase) */
        aliases?: string[];
        /** The command usage format string */
        usage?: string;
        /** Minimum number of arguments the command takes (default is 0) */
        minArgsCount: number;
        /** List of subcommands */
        subcommands: {
            /** The name of the subcommand */
            trigger: string;
            /** A short description of the subcommand */
            description: string;
        }[];
    };

    /** Slash command properties */
    slashCommand: {
        /** Whether the slash command is enabled or not */
        enabled: boolean;
        /** Whether the reply should be ephemeral */
        ephemeral?: boolean;
        /** The command options */
        options: ApplicationCommandOptionData[];
    };

    plugin?: BotPlugin;
    messageRun(ctx: CommandContext): Promise<any>;
    interactionRun(ctx: ChatInputCommandInteractionContext): Promise<any>;
}

interface ContextMenuCommandInteractionContext {
    interaction: ContextMenuCommandInteraction;
}

interface ContextType {
    /** The name of the context */
    name: string;

    /** A short description of the context */
    description: string;

    /** The type of application command */
    type: ApplicationCommandType;

    /** Whether the context is enabled or not */
    enabled?: boolean;

    /** Whether the reply should be ephemeral */
    ephemeral?: boolean;

    /** Permissions required by the user to use the command */
    userPermissions?: PermissionResolvable[];

    /** Command cooldown in seconds */
    cooldown?: number;

    /** The plugin that owns the context */
    plugin: BotPlugin;

    /** The callback to be executed when the context is invoked */
    run(ctx: ContextMenuCommandInteractionContext): Promise<any>;
}

export { BotPlugin, CommandType, ContextType };
