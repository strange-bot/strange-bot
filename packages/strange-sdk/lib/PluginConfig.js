const fs = require("node:fs");
const path = require("node:path");
const deepmerge = require("deepmerge");
const DBClient = require("strange-db-client");
const Logger = require("./utils/Logger");

class PluginConfig {
    static fromDirectory(baseDir) {
        const configPath = path.join(baseDir, "config.json");
        let data = {};

        if (fs.existsSync(configPath)) {
            const configString = fs.readFileSync(configPath, "utf8");
            data = JSON.parse(configString);
        }

        return data;
    }

    static async syncWithDatabase(pluginName, data) {
        if (process.env.DEV_MODE) {
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
