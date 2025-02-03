const { readdirSync, readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const i18next = require("i18next");
const localizationModel = require("./schema");

class I18nManager {
    /**
     * Creates an instance of I18nManager.
     * @param {string} app - The application name.
     * @param {Object} [options={}] - The options for the I18nManager.
     * @param {string} [options.fallbackLng="en-US"] - The fallback language.
     * @param {string} [options.baseDir] - The base directory for local translations.
     * @param {string} [options.pluginsDir] - The plugins directory for local translations.
     */
    constructor(app, options = {}) {
        this.app = app;
        this.translations = new Map();
        this.meta = require(join(__dirname, "../languages-meta.json"));
        this.availableLanguages = this.meta.map((lng) => lng.name);
        this.fallbackLng = options.fallbackLng || "en-US";
        this.baseDir = options.baseDir;
        this.pluginsDir = options.pluginsDir;
    }

    /**
     * Initializes the I18nManager.
     * @returns {Promise<Map<string, Function>>} - A map of translation functions.
     */
    async initialize() {
        await i18next.init({
            debug: false,
            fallbackLng: this.fallbackLng,
            initImmediate: false,
            interpolation: { escapeValue: false },
            load: "all",
            preload: this.availableLanguages,
        });

        if (process.env.DEV_MODE === "1") {
            if (!this.baseDir || !this.pluginsDir) {
                throw new Error("baseDir and pluginsDir are required in local mode");
            }
            this.walkBaseDirectory(this.baseDir);
            this.walkPluginDirectory(this.pluginsDir);
        } else {
            await this.loadFromDb();
        }

        for (const language of this.availableLanguages) {
            const translationFn = i18next.getFixedT(language);
            this.translations.set(language, translationFn);
        }

        return this.translations;
    }

    /**
     * Loads translations from the database.
     * @returns {Promise<void>}
     */
    async loadFromDb() {
        try {
            const localizations = await localizationModel.find().lean();
            for (const localization of localizations) {
                i18next.addResourceBundle(
                    localization.lang,
                    localization.plugin,
                    localization.data,
                    true,
                    true,
                );
            }
        } catch (error) {
            throw new Error(`Failed to load translations from database: ${error.message}`);
        }
    }

    /**
     * Walks through the base directory and loads translations.
     * @param {string} baseDir - The base directory path.
     */
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

    /**
     * Walks through the plugin directory and loads translations.
     * @param {string} pluginsDir - The plugins directory path.
     */
    walkPluginDirectory(pluginsDir) {
        try {
            const plugins = readdirSync(pluginsDir);

            plugins.forEach((pluginDirName) => {
                const packageJsonPath = join(pluginsDir, pluginDirName, "package.json");
                const packageJson = require(packageJsonPath);
                const pluginName = packageJson.name;
                const entry = this.app === "bot" ? "bot" : "dashboard";

                const pluginDir = join(pluginsDir, pluginDirName, `${entry}/locales`);
                if (!existsSync(pluginDir)) {
                    console.debug(`Plugin ${pluginName} does not have locales directory`);
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

    /**
     * Translates a key to the target language.
     * @param {string} key - The translation key.
     * @param {Object|string} [optionsOrLanguage] - The options or target language.
     * @param {string} [language] - The target language.
     * @returns {string} - The translated string.
     */
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

    /**
     * Gets translations for all available languages.
     * @param {string} key - The translation key.
     * @returns {Object} - An object containing translations for all languages.
     */
    getAllTr(key) {
        const localizations = {};
        for (const language of this.translations.keys()) {
            const dKey =
                this.meta.find((lng) => lng.name === language || lng.aliases.includes(language))
                    ?.discord || language;
            localizations[dKey] = this.tr(key, language);
        }
        return localizations;
    }

    /**
     * Updates the resource bundle for a plugin and language.
     * @param {string} plugin - The plugin name.
     * @param {string} language - The language code.
     * @param {Object} data - The translation data.
     * @returns {Promise<void>}
     */
    async updateResourceBundle(plugin, language, data) {
        if (process.env.DEV_MODE === "1") {
            console.warn("Cannot update translations in local config mode");
            return;
        }

        try {
            await localizationModel.findOneAndUpdate(
                { plugin, lang: language },
                { data },
                { upsert: true },
            );
            i18next.addResourceBundle(language, plugin, data, true, true);
        } catch (error) {
            throw new Error(`Failed to update resource bundle: ${error.message}`);
        }
    }
}

module.exports = I18nManager;
