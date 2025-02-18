import { Model } from "mongoose";
import { DBClient } from "strange-db-client";

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
    private static configModel: Model<any>;
    private static dbClient: DBClient;

    private pluginName: string;
    private configKey: string;
    private baseDir: string;
    private configPath: string;
    private configData: ConfigData;
    private initialized: boolean;
    private dbClient: DBClient | null;
    private configModel: Model<any>;

    /**
     * Creates a new Config instance
     * @param pluginName - Name of the plugin
     * @param baseDir - Base directory containing the config file
     * @throws Error If plugin name is not provided
     */
    constructor(pluginName: string, baseDir: string);

    /**
     * Initializes the configuration by syncing with database
     * Should be called before first use
     * @throws Error When initialization fails
     */
    init(): Promise<void>;

    /**
     * Retrieves the configuration data
     * @throws Error When accessed before initialization
     * @returns Configuration object with save method
     */
    get(): Promise<SaveableConfig>;

    /**
     * Saves the current configuration to database
     * @throws Error When save operation fails
     */
    save(): Promise<void>;
}
