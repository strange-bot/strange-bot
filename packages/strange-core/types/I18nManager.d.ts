import { LanguageMeta } from "./language-meta";

/** Configuration options for I18nManager */
interface I18nOptions {
    /** Fallback language code to use when translation is missing */
    fallbackLng?: string;
    /** Base directory containing main locale files */
    baseDir?: string;
    /** Directory containing plugin locale folders */
    pluginsDir?: string;
    /** Whether to use database for translation storage */
    useDatabase?: boolean;
}

/** Manages internationalization for the application */
declare class I18nManager {
    /** Create a new I18nManager instance
     * @param app The application name (e.g. "bot" or "dashboard")
     * @param options Configuration options for i18n
     */
    constructor(app: string, options?: I18nOptions);

    /** Application identifier */
    app: string;
    /** Map of language codes to translation functions */
    translations: Map<string, (key: string, options?: object) => string>;
    /** List of supported languages metadata */
    languagesMeta: LanguageMeta[];
    /** List of supported language codes */
    availableLanguages: string[];
    /** Fallback language code */
    fallbackLng: string;
    /** Base directory for translations */
    baseDir?: string;
    /** Plugins directory */
    pluginsDir?: string;
    /** Whether database storage is enabled */
    useDatabase: boolean;

    /** Initialize the translation system and load all resources
     * @returns A map of translation functions by language
     */
    initialize(): Promise<Map<string, Function>>;

    /** Synchronize translations with database */
    loadAndSyncTranslations(namespace: string): Promise<void>;

    /** Load translations from base directory */
    walkBaseDirectory(baseDir: string): void;

    /** Load translations from plugin directories */
    loadPluginTranslations(pluginsDir: string): Promise<void>;

    /** Remove translations for a plugin */
    removePluginTranslations(pluginName: string): void;

    /** Translate a key to the target language
     * @param key The translation key to lookup
     * @param optionsOrLanguage Either interpolation options or target language
     * @param language Target language (when options provided)
     * @returns The translated string
     */
    tr(key: string, optionsOrLanguage?: string | object, language?: string): string;

    /** Get translations for a key in all available languages
     * @param key The translation key to lookup
     * @returns Object mapping language codes to translated strings
     */
    getAllTr(key: string): Record<string, string>;

    /** Get the resource bundle for a plugin and language
     * @param language The language code
     * @param plugin The plugin name
     * @param flatten Whether to flatten the object structure
     * @returns The resource bundle
     */
    getResourceBundle(language: string, plugin: string, flatten?: boolean): any;

    /** Update translations for a plugin and language
     * @param plugin The plugin name
     * @param language The language code
     * @param data The new translation data
     */
    updateResourceBundle(plugin: string, language: string, data: any): Promise<void>;
}

export = I18nManager;
