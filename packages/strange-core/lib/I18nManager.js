const { readdirSync, readFileSync, existsSync } = require("node:fs");
const { join, resolve } = require("node:path");
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
        this.pluginsDir = resolve(options.pluginsDir);
        this.useDatabase = options.useDatabase || false;
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

        if (this.useDatabase) {
            this.dbClient = DBClient.getInstance();
            this.localizationModel = this.dbClient.registerSchema(
                "localizations",
                localizationSchema,
            );
        }

        if (this.baseDir) {
            this.walkBaseDirectory(this.baseDir);
            if (this.useDatabase) {
                await this.loadAndSyncTranslations("translation");
            }
        }

        for (const language of this.availableLanguages) {
            const translationFn = i18next.getFixedT(language);
            this.translations.set(language, translationFn);
        }

        return this.translations;
    }

    /**
     * Unified method to load and sync translations with database
     * Works for both base translations ("translation" namespace) and plugin translations
     * @param {string} namespace - "translation" for base or plugin name for plugins
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async loadAndSyncTranslations(namespace) {
        try {
            if (!this.useDatabase) {
                return true;
            }

            const localTranslations = {};

            for (const lang of this.availableLanguages) {
                const resources = i18next.getResourceBundle(lang, namespace);
                if (resources) {
                    if (!localTranslations[lang]) localTranslations[lang] = {};
                    localTranslations[lang][namespace] = resources;
                }
            }

            const dbLocalizations = await this.localizationModel
                .find({
                    app: this.app,
                    plugin: namespace,
                })
                .lean();

            const dbTranslationsMap = new Map(
                dbLocalizations.map((loc) => [`${loc.lang}:${loc.plugin}`, loc]),
            );

            const updates = [];
            const inserts = [];

            for (const [lang, namespaces] of Object.entries(localTranslations)) {
                const localData = namespaces[namespace];
                const key = `${lang}:${namespace}`;
                const dbEntry = dbTranslationsMap.get(key);

                if (!dbEntry) {
                    inserts.push({
                        insertOne: {
                            document: {
                                app: this.app,
                                lang,
                                plugin: namespace,
                                data: localData,
                            },
                        },
                    });
                    i18next.addResourceBundle(lang, namespace, localData, true, true);
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
                    i18next.addResourceBundle(lang, namespace, mergedData, true, true);
                }
            }

            if (inserts.length > 0) {
                await this.localizationModel.bulkWrite(inserts);
            }
            if (updates.length > 0) {
                await this.localizationModel.bulkWrite(updates);
            }

            return true;
        } catch (error) {
            throw new Error(
                `Failed to sync translations for ${namespace} with database: ${error.message}`,
            );
        }
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

    async loadPluginTranslations(pluginDirName) {
        try {
            if (!this.pluginsDir) {
                throw new Error("No plugins directory configured");
            }

            const packageJsonPath = join(this.pluginsDir, pluginDirName, "package.json");
            const packageJson = require(packageJsonPath);
            const pluginName = packageJson.name;
            const entry = this.app === "bot" ? "bot" : "dashboard";

            const pluginDir = join(this.pluginsDir, pluginDirName, `${entry}/locales`);
            if (!existsSync(pluginDir)) {
                return false;
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

            await this.loadAndSyncTranslations(pluginName);
        } catch (error) {
            throw new Error(`Failed to load plugin translations: ${error.message}`);
        }
    }

    removePluginTranslations(pluginName) {
        try {
            for (const lang of this.availableLanguages) {
                i18next.removeResourceBundle(lang, pluginName);
            }
            return true;
        } catch (error) {
            throw new Error(`Failed to remove plugin translations: ${error.message}`);
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
