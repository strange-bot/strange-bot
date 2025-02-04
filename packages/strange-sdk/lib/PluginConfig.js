const fs = require("node:fs");
const path = require("node:path");
const deepmerge = require("deepmerge");
const DBClient = require("strange-db-client");
const Logger = require("./utils/Logger");

/**
 * Utility class for managing plugin configurations
 * Handles loading from files and syncing with database
 */
class PluginConfig {
    /**
     * Loads plugin configuration from a directory
     * @param {string} baseDir - Base directory containing config.json
     * @returns {object} The configuration object
     */
    static fromDirectory(baseDir) {
        const configPath = path.join(baseDir, "config.json");
        let data = {};

        if (fs.existsSync(configPath)) {
            const configString = fs.readFileSync(configPath, "utf8");
            data = JSON.parse(configString);
        }

        return data;
    }

    /**
     * Synchronizes plugin configuration with database
     * @param {string} pluginName - Name of the plugin
     * @param {object} data - Configuration data to sync
     * @returns {Promise<object>} Merged configuration
     * @throws {Error} If no plugin name is specified
     */
    static async syncWithDatabase(pluginName, data) {
        if (process.env.NODE_ENV !== "production") {
            Logger.debug("Skipping config sync in dev mode");
            return;
        }

        if (!pluginName) {
            throw new Error("Cannot sync with database: No plugin name specified");
        }

        Logger.debug("Syncing config with database", pluginName, data);

        const dbConfig = await DBClient.getInstance().getPluginConfig(pluginName);
        const merged = deepmerge(data, dbConfig);
        await DBClient.getInstance().updatePluginConfig(pluginName, merged);

        return merged;
    }
}

module.exports = PluginConfig;
