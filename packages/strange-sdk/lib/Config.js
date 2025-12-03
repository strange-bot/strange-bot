const fs = require("node:fs");
const path = require("node:path");
const { Logger, MiscUtils } = require("./utils");

class Config {
    constructor(pluginName, baseDir) {
        if (!pluginName) throw new Error("Plugin name is required");

        this.pluginName = pluginName;
        this.cacheKey = `${this.pluginName}:config`;
        this.configPath = path.join(baseDir, "config.json");
        this.dbClient = null;
    }

    async init(dbClient = null) {
        if (!dbClient) {
            Logger.debug("DBClient is not initialized: Local config will be used");
            return;
        }

        this.dbClient = dbClient;
        let localConfig = {};
        if (fs.existsSync(this.configPath)) {
            try {
                localConfig = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
            } catch (error) {
                throw new Error(`Failed to parse config file: ${error.message}`);
            }
        }

        try {
            const configModel = this.dbClient.getModel("configs");
            if (!configModel) {
                throw new Error("Cannot find configs schema in database");
            }
            const dbConfig = await configModel.findById(this.pluginName).lean();
            const { merged, shouldSync } = MiscUtils.mergeObjects(
                localConfig,
                dbConfig?.config || {},
            );

            if (shouldSync) {
                await configModel.updateOne(
                    { _id: this.pluginName },
                    { $set: { config: merged } },
                    { upsert: true },
                );
            }
        } catch (error) {
            Logger.error(`Failed to sync config with database: ${error.message}`, error);
        }
    }

    async get() {
        let currentConfig = {};

        // 1. Try cache / DB
        if (this.dbClient) {
            try {
                const cachedConfig = await this.dbClient.getFromCache(this.cacheKey);
                if (cachedConfig) {
                    currentConfig = JSON.parse(cachedConfig);
                } else {
                    const configModel = this.dbClient.getModel("configs");
                    const dbConfig = await configModel.findById(this.pluginName).lean();
                    if (dbConfig?.config) {
                        currentConfig = dbConfig.config;
                        await this.dbClient.addToCache(this.cacheKey, currentConfig, 0);
                    }
                }
            } catch (error) {
                Logger.error(`Failed to get config from database: ${error.message}`);
            }
        }

        // 2. Fallback to file if we still have no config
        if (
            (!currentConfig || Object.keys(currentConfig).length === 0) &&
            fs.existsSync(this.configPath)
        ) {
            try {
                const fileContent = fs.readFileSync(this.configPath, "utf8");
                currentConfig = JSON.parse(fileContent);
            } catch (error) {
                Logger.warn(`Failed to parse config file: ${error.message}`);
            }
        }

        // 3. Ensure we at least have an object
        if (!currentConfig || typeof currentConfig !== "object") {
            currentConfig = {};
        }

        // 4. Return a proxy to handle get/set and saving
        const self = this;
        return new Proxy(currentConfig, {
            get(target, prop, receiver) {
                if (prop === "save") {
                    return () => self.save(target);
                }
                return Reflect.get(target, prop, receiver);
            },

            set(target, prop, value, receiver) {
                return Reflect.set(target, prop, value, receiver);
            },
        });
    }

    async save(configToSave) {
        if (!this.dbClient) {
            Logger.warn(`Cannot save config for ${this.pluginName}: Running in local mode`);
            return;
        }

        try {
            const configModel = this.dbClient.getModel("configs");
            await configModel.updateOne(
                { _id: this.pluginName },
                { $set: { config: configToSave } },
                { upsert: true },
            );
            await this.dbClient.addToCache(this.cacheKey, configToSave, 0);
        } catch (error) {
            Logger.error(`Failed to save configuration: ${error.message}`);
            throw error;
        }
    }
}

module.exports = Config;
