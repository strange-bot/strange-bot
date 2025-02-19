import { DBClient, Model } from "strange-db-client";

export interface ConfigData {
    [key: string]: any;
}

export interface SaveableConfig extends ConfigData {
    save(): Promise<void>;
}

/**
 * Config class for managing plugin configurations with database synchronization
 * Supports both local file and database storage with caching
 */
export class Config {
    private pluginName: string;
    private cacheKey: string;
    private configPath: string;
    private dbClient: DBClient | null;

    /**
     * Creates a new Config instance
     * @param pluginName - Name of the plugin
     * @param baseDir - Base directory containing the config file
     * @throws Error If plugin name is not provided
     */
    constructor(pluginName: string, baseDir: string);

    /**
     * Initializes the configuration by syncing with database
     * @param dbClient - Optional database client for syncing
     * @throws Error When initialization fails
     */
    init(dbClient?: DBClient | null): Promise<void>;

    /**
     * Retrieves the configuration data
     * @returns Configuration object with save method
     */
    get(): Promise<SaveableConfig>;

    /**
     * Saves the configuration to database
     * @param configToSave - Configuration data to save
     * @throws Error When save operation fails or running in local mode
     */
    private save(configToSave: ConfigData): Promise<void>;
}
