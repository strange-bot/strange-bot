require("dotenv").config();

const { readdirSync, statSync, existsSync } = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const deepmerge = require("deepmerge");
const ConfigModel = require("../src/schemas/Config");
const { Logger } = require("strange-sdk/utils");
const { Config } = require("strange-sdk");

Logger.init();

/**
 *
 */
async function syncConfig() {
    // Get the list of directories in the plugins directory
    const pluginsDir = path.join(__dirname, "..", "plugins");
    const pluginDirs = readdirSync(pluginsDir).filter((file) =>
        statSync(path.join(pluginsDir, file)).isDirectory(),
    );

    // Iterate over each plugin directory
    for (let dir of pluginDirs) {
        const configPath = path.join(pluginsDir, dir, "config.js");

        // Check if the config.js file exists
        if (existsSync(configPath)) {
            const configData = require(configPath);
            if (!(configData instanceof Config)) continue;

            // Fetch the existing config from the database
            const existingConfig = await ConfigModel.findById(dir);

            if (existingConfig) {
                // If the config exists in the database, update it
                existingConfig.config = deepmerge(existingConfig.config, configData.data, {
                    arrayMerge: (target, _source, _options) => target,
                });
                await existingConfig.save();
            } else {
                // If the config does not exist in the database, create it
                const newConfig = new ConfigModel({
                    _id: dir,
                    config: configData.data,
                });
                await newConfig.save();
            }
        }
    }

    console.log("Config synced with the database.");
}

// Connect to the MongoDB database
mongoose.connect(process.env.MONGO_CONNECTION).then(() => {
    console.log("Connected to MongoDB");
    syncConfig()
        .then(() => {
            mongoose.disconnect();
        })
        .catch((err) => {
            console.error(err);
            mongoose.disconnect();
        })
        .finally(() => {
            process.exit(0);
        });
});
