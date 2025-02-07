require("dotenv").config();

const { readdirSync, readFileSync, existsSync, lstatSync } = require("node:fs");
const { join } = require("node:path");
const deepmerge = require("deepmerge");
const mongoose = require("mongoose");
const Model = require("../src/schemas/Localization");
const meta = require("../src/locales/languages-meta.json");

const availableLanguages = meta.map((lng) => lng.name);

/**
 *
 */
function syncLocalizationData(localData, dbData) {
    // deep clone of the dbData to avoid modifying the original object
    const mergedData = deepmerge({}, dbData);

    // Merge localData into the cloned dbData, preferring dbData values for existing keys
    for (const key in localData) {
        if (typeof localData[key] === "object" && localData[key] !== null && dbData[key]) {
            mergedData[key] = syncLocalizationData(localData[key], dbData[key]);
        } else {
            mergedData[key] = dbData[key] !== undefined ? dbData[key] : localData[key];
        }
    }

    // Ensure keys not present in localData are removed from mergedData
    for (const key in mergedData) {
        if (!(key in localData)) {
            delete mergedData[key];
        }
    }

    return mergedData;
}

/**
 * Walks through the base directory to load all translations
 * @param {string} baseDir
 */
async function walkBaseDirectory(baseDir) {
    const locales = readdirSync(baseDir).filter((file) =>
        lstatSync(join(baseDir, file)).isDirectory(),
    );

    for (const lngFile of locales) {
        if (!availableLanguages.includes(lngFile)) {
            console.log("Invalid language", lngFile);
            continue;
        }

        const lng = lngFile;
        const nss = readdirSync(join(baseDir, lngFile));

        for (const nsFile of nss) {
            const ns = nsFile.split(".")[0];

            const translationFilePath = join(baseDir, lngFile, nsFile);
            const localData = JSON.parse(readFileSync(translationFilePath, "utf8"));

            const dbLocalization = await Model.findOne({ plugin: ns, lang: lng });
            let updatedData;
            if (dbLocalization) {
                updatedData = syncLocalizationData(localData, dbLocalization.data);
            } else {
                updatedData = localData;
            }

            await Model.updateOne(
                { plugin: ns, lang: lng },
                { $set: { data: updatedData } },
                { upsert: true },
            );
        }
    }
}

/**
 * Walks through the plugin directory to load all translations
 * @param {string} pluginsDir
 */
async function walkPluginDirectory(pluginsDir) {
    const plugins = readdirSync(pluginsDir);

    for (const pluginName of plugins) {
        const pluginDir = join(pluginsDir, pluginName, "locales");
        if (!existsSync(pluginDir)) continue;

        const locales = readdirSync(pluginDir);
        for (const lngFile of locales) {
            const lng = lngFile.split(".")[0];

            if (!availableLanguages.includes(lng)) {
                console.log("Invalid language", lng);
                continue;
            }

            const translationFilePath = join(pluginDir, lngFile);
            const localData = JSON.parse(readFileSync(translationFilePath, "utf8"));

            const dbLocalization = await Model.findOne({ plugin: pluginName, lang: lng });

            let updatedData;
            if (dbLocalization) {
                updatedData = syncLocalizationData(localData, dbLocalization.data);
            } else {
                updatedData = localData;
            }

            await Model.updateOne(
                { plugin: pluginName, lang: lng },
                { $set: { data: updatedData } },
                { upsert: true },
            );
        }
    }
}

mongoose.connect(process.env.MONGO_CONNECTION).then(async () => {
    console.log("Connected to MongoDB");

    const baseDir = join(__dirname, "..", "src", "locales");
    const pluginsDir = join(__dirname, "..", "plugins");

    await walkBaseDirectory(baseDir);
    await walkPluginDirectory(pluginsDir);

    console.log("Localization synced with the database.");

    mongoose.disconnect();
});
