const fs = require("fs");
const path = require("path");
const deepmerge = require("deepmerge");
const DBClient = require("strange-db-client");
const Logger = require("./utils/Logger");

class Config {
    constructor(pluginName, data) {
        this.data = data;
        this.pluginName = pluginName;
    }

    static fromDirectory(baseDir) {
        const packageJson = require(path.join(baseDir, "package.json"));
        const pluginName = packageJson.name;

        const configPath = path.join(baseDir, "config.json");
        let data = {};

        if (fs.existsSync(configPath)) {
            const configString = fs.readFileSync(configPath, "utf8");
            data = JSON.parse(configString);
        }

        return new Config(pluginName, data);
    }

    static fromObject(pluginName, data) {
        return new Config(pluginName, data);
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
    }

    async syncWithDb() {
        if (process.env.DEV_MODE) {
            Logger.debug("Skipping config sync in dev mode");
            return;
        }

        if (!this.pluginName) {
            throw new Error("Cannot sync with database: No plugin name specified");
        }

        Logger.debug("Syncing config with database", this.pluginName, this.data);

        const dbConfig = await DBClient.getInstance().getPluginConfig(this.pluginName);
        const merged = deepmerge(this.data, dbConfig);
        await DBClient.getInstance().updatePluginConfig(this.pluginName, merged);
        this.data = merged;
    }
}

module.exports = Config;
