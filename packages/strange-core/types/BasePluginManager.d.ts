/** Base class for plugin management */
declare class BasePluginManager {
    /** Map of loaded plugins */
    protected _pluginMap: Map<string, any>;

    /** Cache of cloned repositories */
    private repoCache: Map<string, string>;

    /**
     * @param registryPath - Path to plugins registry file
     */
    constructor(registryPath: string);

    /** List of loaded plugins */
    get plugins(): any[];

    /** Check if a plugin is enabled */
    isPluginEnabled(pluginName: string): boolean;

    /** Get plugin instance by name */
    getPlugin(
        pluginName: string,
    ): import("strange-sdk").BotPlugin | import("strange-sdk").BotPlugin;

    /** Initialize plugin manager and load enabled plugins */
    init(): Promise<void>;

    /** Enable a specific plugin */
    enablePlugin(pluginName: string): Promise<void>;

    /** Disable a specific plugin */
    disablePlugin(pluginName: string): Promise<void>;

    /** Get metadata for all plugins */
    getPluginsMeta(): Promise<
        Array<{
            name: string;
            repository: string;
            repositoryPath?: string;
            dependencies?: string[];
            installed: boolean;
            enabled: boolean;
        }>
    >;

    /** Install a plugin */
    installPlugin(pluginName: string): Promise<void>;

    /** Uninstall a plugin */
    uninstallPlugin(pluginName: string): Promise<void>;
}

export = BasePluginManager;
