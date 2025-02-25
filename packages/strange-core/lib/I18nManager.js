const { readdirSync, readFileSync, existsSync, statSync } = require("node:fs");
const { join } = require("node:path");
const i18next = require("i18next");
const deepmerge = require("deepmerge");
const flat = require("flat");
const { DBClient } = require("strange-db-client");
const localizationSchema = require("./schemas/i18n");

class I18nManager {
    constructor(app, options = {}) {
        this.app = app;
        this.translations = new Map();
        this.languagesMeta = require(join(__dirname, "../languages-meta.json"));
        this.availableLanguages = this.languagesMeta.map((lng) => lng.name);
        this.fallbackLng = options.fallbackLng || "en-US";
        this.baseDir = options.baseDir;
        this.pluginsDir = options.pluginsDir;
        this.useDatabase = options.useDatabase || false;

        if (this.useDatabase) {
            this.dbClient = DBClient.getInstance();
            this.localizationModel = this.dbClient.registerSchema(
                "localizations",
                localizationSchema,
            );
        }
    }

    async initialize() {
        await i18next.init({
            debug: false,
            fallbackLng: this.fallbackLng,
            initImmediate: false,
            interpolation: { escapeValue: false },
            load: "all",
            preload: this.availableLanguages,
        });

        if (this.baseDir && this.pluginsDir) {
            this.walkBaseDirectory(this.baseDir);
            this.walkPluginDirectory(this.pluginsDir);
        }

        if (this.useDatabase) {
            await this.syncWithDatabase();
        }

        for (const language of this.availableLanguages) {
            const translationFn = i18next.getFixedT(language);
            this.translations.set(language, translationFn);
        }

        return this.translations;
    }

    async syncWithDatabase() {
        try {
            const localTranslations = this.getAllLocalTranslations();
            const dbLocalizations = await this.localizationModel.find({ app: this.app }).lean();
            const dbTranslationsMap = new Map(
                dbLocalizations.map((loc) => [`${loc.lang}:${loc.plugin}`, loc]),
            );

            const updates = [];
            const inserts = [];

            for (const [lang, plugins] of Object.entries(localTranslations)) {
                for (const [plugin, localData] of Object.entries(plugins)) {
                    const key = `${lang}:${plugin}`;
                    const dbEntry = dbTranslationsMap.get(key);

                    if (!dbEntry) {
                        inserts.push({
                            insertOne: {
                                document: {
                                    app: this.app,
                                    lang,
                                    plugin,
                                    data: localData,
                                },
                            },
                        });
                        i18next.addResourceBundle(lang, plugin, localData, true, true);
                    } else {
                        const mergedData = deepmerge(dbEntry.data, localData, {
                            arrayMerge: (destination, _source) => destination,
                            customMerge: (_key) => {
                                return (dbValue, localValue) => {
                                    return dbValue !== undefined ? dbValue : localValue;
                                };
                            },
                        });

                        if (JSON.stringify(mergedData) !== JSON.stringify(dbEntry.data)) {
                            updates.push({
                                updateOne: {
                                    filter: { _id: dbEntry._id },
                                    update: { $set: { data: mergedData } },
                                },
                            });
                        }
                        i18next.addResourceBundle(lang, plugin, mergedData, true, true);
                    }
                }
            }

            if (inserts.length > 0) {
                await this.localizationModel.bulkWrite(inserts);
            }
            if (updates.length > 0) {
                await this.localizationModel.bulkWrite(updates);
            }
        } catch (error) {
            throw new Error(`Failed to sync translations with database: ${error.message}`);
        }
    }

    getAllLocalTranslations() {
        const translations = {};

        for (const lang of this.availableLanguages) {
            translations[lang] = {};
            const resources = i18next.services.resourceStore.data[lang] || {};

            for (const [plugin, data] of Object.entries(resources)) {
                translations[lang][plugin] = data;
            }
        }

        return translations;
    }

    walkBaseDirectory(baseDir) {
        try {
            const locales = readdirSync(baseDir).filter((file) => file.endsWith(".json"));

            locales.forEach((lngFile) => {
                const lng = lngFile.split(".")[0];

                if (!this.availableLanguages.includes(lng)) {
                    console.warn(`Invalid language file: ${lngFile}`);
                    return;
                }

                const translationFilePath = join(baseDir, lngFile);
                const translationData = JSON.parse(readFileSync(translationFilePath, "utf8"));
                i18next.addResourceBundle(lng, "translation", translationData);
            });
        } catch (error) {
            throw new Error(`Failed to walk base directory: ${error.message}`);
        }
    }

    walkPluginDirectory(pluginsDir) {
        try {
            const plugins = readdirSync(pluginsDir).filter((dir) => {
                const stats = statSync(join(pluginsDir, dir));
                return stats.isDirectory() && !dir.startsWith(".") && !dir.endsWith(".lock");
            });

            plugins.forEach((pluginDirName) => {
                const packageJsonPath = join(pluginsDir, pluginDirName, "package.json");
                const packageJson = require(packageJsonPath);
                const pluginName = packageJson.name;
                const entry = this.app === "bot" ? "bot" : "dashboard";

                const pluginDir = join(pluginsDir, pluginDirName, `${entry}/locales`);
                if (!existsSync(pluginDir)) {
                    return;
                }

                const locales = readdirSync(pluginDir);
                locales.forEach((lngFile) => {
                    const lng = lngFile.split(".")[0];

                    if (!this.availableLanguages.includes(lng)) {
                        console.warn(`Invalid language file: ${lngFile}`);
                        return;
                    }

                    const translationFilePath = join(pluginDir, lngFile);
                    const translationData = JSON.parse(readFileSync(translationFilePath, "utf8"));
                    i18next.addResourceBundle(lng, pluginName, translationData);
                });
            });
        } catch (error) {
            throw new Error(`Failed to walk plugin directory: ${error.message}`);
        }
    }

    tr(key, optionsOrLanguage, language) {
        const targetLanguage =
            typeof optionsOrLanguage === "string"
                ? optionsOrLanguage
                : language || this.fallbackLng;
        const options = typeof optionsOrLanguage === "object" ? optionsOrLanguage : undefined;
        const translationFn = this.translations.get(targetLanguage);

        if (!translationFn) {
            throw new Error(`Language ${targetLanguage} not found`);
        }

        return translationFn(key, options);
    }

    getAllTr(key) {
        const localizations = {};
        for (const language of this.translations.keys()) {
            const dKey =
                this.languagesMeta.find(
                    (lng) => lng.name === language || lng.aliases.includes(language),
                )?.discord || language;
            localizations[dKey] = this.tr(key, language);
        }
        return localizations;
    }

    getResourceBundle(language, plugin, flatten = false) {
        const bundle = i18next.getResourceBundle(language, plugin) || {};
        return flatten ? flat.flatten(bundle) : bundle;
    }

    async updateResourceBundle(plugin, language, data) {
        try {
            const currentBundle = i18next.getResourceBundle(language, plugin) || {};
            const unflattenedData = flat.unflatten(data);

            if (JSON.stringify(currentBundle) !== JSON.stringify(unflattenedData)) {
                if (this.useDatabase) {
                    await this.localizationModel.updateOne(
                        { app: this.app, plugin, lang: language },
                        { data: unflattenedData },
                        { upsert: true },
                    );
                }

                i18next.addResourceBundle(language, plugin, unflattenedData, true, true);
            }
        } catch (error) {
            throw new Error(`Failed to update resource bundle: ${error.message}`);
        }
    }
}

module.exports = I18nManager;
