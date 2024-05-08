
const { readdirSync, readFileSync, existsSync, lstatSync } = require("node:fs");
const { join } = require("node:path");
const i18next = require("i18next");
const meta = require("../locales/languages-meta.json");

const availableLanguages = meta.map((lng) => lng.name);
const translations = new Map();

/**
 * Walks through the base directory to load all translations
 * @param {string} baseDir
 * @param {import("i18next").i18n} i18next
 */
function walkBaseDirectory(baseDir, i18next) {
    const locales = readdirSync(baseDir).filter((file) =>
        lstatSync(join(baseDir, file)).isDirectory(),
    );

    locales.forEach((lngFile) => {
        if (!availableLanguages.includes(lngFile)) {
            console.log("Invalid language", lngFile);
            return;
        }

        const lng = lngFile;
        const nss = readdirSync(join(baseDir, lngFile));

        nss.forEach((nsFile) => {
            const ns = nsFile.split(".")[0];

            const translationFilePath = join(baseDir, lngFile, nsFile);
            const translationData = JSON.parse(readFileSync(translationFilePath, "utf8"));

            // Add translation resources to i18next
            i18next.addResourceBundle(lng, ns, translationData);
        });
    });
}

/**
 * Walks through the plugin directory to load all translations
 * @param {string} pluginsDir
 * @param {import("i18next").i18n} i18next
 */
function walkPluginDirectory(pluginsDir, i18next) {
    const plugins = readdirSync(pluginsDir);

    plugins.forEach((pluginName) => {
        const pluginDir = join(pluginsDir, pluginName, "locales");
        if (!existsSync(pluginDir)) return;

        const locales = readdirSync(pluginDir);
        locales.forEach((lngFile) => {
            const lng = lngFile.split(".")[0];

            if (!availableLanguages.includes(lng)) {
                console.log("Invalid language", lng);
                return;
            }

            const translationFilePath = join(pluginDir, lngFile);
            const translationData = JSON.parse(readFileSync(translationFilePath, "utf8"));

            // Add translation resources to i18next
            i18next.addResourceBundle(lng, pluginName, translationData);
        });
    });
}

async function initializeI18n() {
    await i18next.init({
        debug: false,
        fallbackLng: "en-US",
        initImmediate: false,
        interpolation: { escapeValue: false },
        load: "all",
        preload: availableLanguages,
    });

    walkBaseDirectory(join(__dirname, "../locales"), i18next);
    walkPluginDirectory(join(__dirname, "../../plugins"), i18next);

    for (const language of availableLanguages) {
        const translationFn = i18next.getFixedT(language);
        translations.set(language, translationFn);
    }

    return translations;
}

function tr(key, optionsOrLanguage, language) {
    const targetLanguage =
        typeof optionsOrLanguage === "string" ? optionsOrLanguage : language || "en-US";
    const options = typeof optionsOrLanguage === "object" ? optionsOrLanguage : undefined;
    const translationFn = translations.get(targetLanguage);
    if (!translationFn) throw new Error(`Language ${targetLanguage} not found`);
    return translationFn(key, options);
}

function getAllTr(key) {
    const localizations = {};
    for (const language of translations.keys()) {
        const dKey =
            meta.find((lng) => lng.name === language || lng.aliases.includes(language))?.discord ||
            language;
        localizations[dKey] = tr(key, language);
    }
    return localizations;
}

module.exports = {
    initializeI18n,
    tr,
    getAllTr,
};
