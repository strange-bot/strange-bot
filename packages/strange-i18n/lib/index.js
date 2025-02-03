const { readdirSync, readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const i18next = require("i18next");
const localizationModel = require("./schema");
const { Logger } = require("strange-sdk/utils");

class I18nManager {
    constructor(options = {}) {
        this.translations = new Map();
        this.meta = require(join(__dirname, "../languages-meta.json"));
        this.availableLanguages = this.meta.map((lng) => lng.name);
        this.fallbackLng = options.fallbackLng || "en-US";
        this.baseDir = options.baseDir;
        this.pluginsDir = options.pluginsDir;
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
            Logger.error("Failed to load translations from database", error);
            throw error;
        }
    }

    walkBaseDirectory(baseDir) {
        try {
            const locales = readdirSync(baseDir).filter((file) => file.endsWith(".json"));

            locales.forEach((lngFile) => {
                const lng = lngFile.split(".")[0];

                if (!this.availableLanguages.includes(lng)) {
                    Logger.warn(`Invalid language file: ${lngFile}`);
                    return;
                }

                const translationFilePath = join(baseDir, lngFile);
                const translationData = JSON.parse(readFileSync(translationFilePath, "utf8"));
                i18next.addResourceBundle(lng, "translation", translationData);
            });
        } catch (error) {
            Logger.error("Failed to walk base directory", error);
            throw error;
        }
    }

    walkPluginDirectory(pluginsDir) {
        try {
            const plugins = readdirSync(pluginsDir);

            plugins.forEach((pluginDirName) => {
                const packageJsonPath = join(pluginsDir, pluginDirName, "package.json");
                const packageJson = require(packageJsonPath);
                const pluginName = packageJson.name;

                const pluginDir = join(pluginsDir, pluginDirName, "locales");
                if (!existsSync(pluginDir)) {
                    Logger.debug(`Plugin ${pluginName} does not have locales directory`);
                    return;
                }

                const locales = readdirSync(pluginDir);
                locales.forEach((lngFile) => {
                    const lng = lngFile.split(".")[0];

                    if (!this.availableLanguages.includes(lng)) {
                        Logger.warn(`Invalid language file: ${lngFile}`);
                        return;
                    }

                    const translationFilePath = join(pluginDir, lngFile);
                    const translationData = JSON.parse(readFileSync(translationFilePath, "utf8"));
                    i18next.addResourceBundle(lng, pluginName, translationData);
                });
            });
        } catch (error) {
            Logger.error("Failed to walk plugin directory", error);
            throw error;
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
                this.meta.find((lng) => lng.name === language || lng.aliases.includes(language))
                    ?.discord || language;
            localizations[dKey] = this.tr(key, language);
        }
        return localizations;
    }

    async updateResourceBundle(plugin, language, data) {
        if (process.env.DEV_MODE === "1") {
            Logger.warn("Cannot update translations in local config mode");
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
            Logger.error(`Failed to update resource bundle: ${error.message}`);
            throw error;
        }
    }
}

module.exports = I18nManager;
