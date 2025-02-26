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
    /** Map of loaded plugins */

    /**
     * @param registryPath - Path to plugins registry file
     */
    constructor(registryPath: string);

    /** List of loaded plugins */
    get plugins(): Array<BotPlugin | DashboardPlugin>;

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
     * Initialize plugin manager and load enabled plugins
     * @throws Error if core plugin is not found
     */
    init(): Promise<void>;

    /**
     * Enable a specific plugin
     * @param pluginName - Name of the plugin to enable
     * @throws Error if plugin is already enabled or not installed
     */
    enablePlugin(pluginName: string): Promise<void>;

    /**
     * Called when a plugin is enabled
     * @param pluginName - Name of the plugin
     * @returns The plugin instance
     */
    protected onEnable(pluginName: string): Promise<BotPlugin | DashboardPlugin>;

    /**
     * Disable a specific plugin
     * @param pluginName - Name of the plugin to disable
     * @throws Error if plugin is core, not enabled, or has dependents
     */
    disablePlugin(pluginName: string): Promise<void>;

    /**
     * Called when a plugin is disabled
     * @param pluginName - Name of the plugin
     */
    protected onDisable(pluginName: string): Promise<void>;

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
            installed: boolean;
            enabled: boolean;
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
