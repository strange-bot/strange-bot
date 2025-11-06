import { BotPlugin, DashboardPlugin } from "strange-sdk";

/** Base class for plugin management */
declare class BasePluginManager {
    private #pluginMap: Map<string, BotPlugin | DashboardPlugin>;
    /** Cache of cloned repositories */
    private #repoCache: Map<string, string>;

    /** Path to plugins registry file */
    protected registryPath: string;
    /** Directory containing plugins */
    protected pluginsDir: string;
    /** Directory containing plugin lock files */
    protected pluginsLockDir: string;

    /**
     * @param registryPath - Path to plugins registry file
     * @param pluginsDir - Directory containing plugins
     */
    constructor(registryPath: string, pluginsDir: string);

    /** List of loaded plugins */
    get plugins(): Array<BotPlugin | DashboardPlugin>;

    /** List of available plugin names */
    get availablePlugins(): string[];

    /**
     * Check if a plugin is enabled
     * @param pluginName - Name of the plugin to check
     * @returns Whether the plugin is enabled
     */
    isPluginEnabled(pluginName: string): boolean;

    /**
     * Get plugin instance by name
     * @param pluginName - Name of the plugin to get
     * @returns The plugin instance or undefined if not found
     */
    getPlugin(pluginName: string): BotPlugin | DashboardPlugin | undefined;

    /**
     * Set plugin instance by name
     * @param pluginName - Name of the plugin to set
     * @param plugin - The plugin instance
     */
    setPlugin(pluginName: string, pluginInstance: BotPlugin | DashboardPlugin): void;

    /**
     * Remove plugin instance by name
     * @param pluginName - Name of the plugin to remove
     */
    removePlugin(pluginName: string): void;

    /**
     * Initialize plugin manager and load enabled plugins
     * @throws Error if core plugin is not found
     */
    init(): Promise<void>;

    /**
     * Hook invoked after files are in place and dependencies installed.
     * Override in derived classes to run plugin-specific post-install tasks
     * (e.g. asset builds). By default it's a no-op.
     * @param pluginName - Name of the plugin to enable
     * @param targetPath - Path where the plugin is installed
     * @param meta - Metadata of the plugin
     * @protected
     */
    postInstall(pluginName: string, targetPath: string, meta: object): Promise<void>;

    /**
     * Hook invoked before uninstalling a plugin. Override in derived classes to run
     * plugin-specific pre-uninstall tasks. By default it's a no-op.
     * @param pluginName - Name of the plugin to disable
     * @throws Error if plugin is core, not enabled, or has dependents
     */
    preUninstall(pluginName: string): Promise<void>;

    /**
     * Called after installation to enable the plugin. Override in derived classes to run
     * plugin-specific enable tasks. By default it's a no-op.
     * @param pluginName - Name of the plugin to enable
     * @param targetPath - Path where the plugin is installed
     * @param meta - Metadata of the plugin
     */
    enablePlugin(
        pluginName: string,
        targetPath: string,
        meta: object,
    ): Promise<BotPlugin | DashboardPlugin | void>;

    /**
     * Called before uninstallation to disable the plugin. Override in derived classes to run
     * plugin-specific disable tasks. By default it's a no-op.
     * @param pluginName - Name of the plugin to disable
     */
    disablePlugin(pluginName: string): Promise<void>;

    /**
     * Enable a plugin in a specific guild
     * @param pluginName - Name of the plugin to enable
     * @param guildId - ID of the guild
     */
    enableInGuild(pluginName: string, guildId: string): Promise<void>;

    /**
     * Disable a plugin in a specific guild
     * @param pluginName - Name of the plugin to disable
     * @param guildId - ID of the guild
     */
    disableInGuild(pluginName: string, guildId: string): Promise<void>;

    /**
     * Get metadata for all plugins
     * @returns Array of plugin metadata
     */
    getPluginsMeta(): Promise<
        Array<{
            name: string;
            version: string;
            author: string;
            repository: string;
            repositoryPath?: string;
            dependencies?: string[];
            isInstalled: boolean;
            isEnabled: boolean;
            currentVersion?: string;
            hasUpdate?: boolean;
        }>
    >;

    /**
     * Install a plugin
     * @param pluginName - Name of the plugin to install
     * @throws Error if plugin is already installed or dependencies are missing
     */
    installPlugin(pluginName: string): Promise<void>;

    /**
     * Uninstall a plugin
     * @param pluginName - Name of the plugin to uninstall
     * @throws Error if plugin is currently enabled
     */
    uninstallPlugin(pluginName: string): Promise<void>;
}

export = BasePluginManager;
