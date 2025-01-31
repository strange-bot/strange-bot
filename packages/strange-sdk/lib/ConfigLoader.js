const fs = require("fs");
const path = require("path");
const deepmerge = require("deepmerge");
const DBClient = require("strange-db-client");
const { Logger } = require("strange-sdk/utils");

module.exports = class ConfigLoader {
    constructor(baseDir) {
        const packageJson = require(path.join(baseDir, "package.json"));
        this.pluginName = packageJson.name;

        const configPath = path.join(baseDir, "config.json");
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const configString = fs.readFileSync(configPath, "utf8");
        this.config = JSON.parse(configString);
    }

    async syncWithDb() {
        Logger.debug("Syncing config with database", this.pluginName);

        let merged;
        if (process.env.DEV_MODE === 1) {
            merged = this.config;
        } else {
            const dbConfig = await DBClient.getInstance().getPluginConfig(this.pluginName);
            merged = deepmerge(this.config, dbConfig);
        }

        await DBClient.getInstance().updatePluginConfig(this.pluginName, merged);
    }
};
