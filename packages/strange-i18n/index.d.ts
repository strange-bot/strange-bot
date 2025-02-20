declare module "strange-i18n" {
    /** Metadata for a supported language */
    export interface LanguageMeta {
        /** ISO language code (e.g. "en-US") */
        name: string;
        /** Native language name (e.g. "English") */
        nativeName: string;
        /** Discord's language code (e.g. "en-US") */
        discord: string;
        /** Two-letter country code for flag icons */
        svg_code: string;
        /** Alternative codes/names for this language */
        aliases: string[];
    }

    interface I18nOptions {
        /** The fallback language to use when a translation is missing */
        fallbackLng?: string;
        /** Base directory containing core translation files */
        baseDir?: string;
        /** Directory containing plugin translation files */
        pluginsDir?: string;
        /** Whether to sync translations with database */
        useDatabase?: boolean;
    }

    interface ResourceBundle {
        [key: string]: any;
    }

    class I18nManager {
        /** Create a new I18nManager instance
         * @param app The application name (e.g. "bot" or "dashboard")
         * @param options Configuration options for i18n
         */
        constructor(app: string, options?: I18nOptions);

        /** The application name */
        app: string;
        /** Map of language codes to translation functions */
        translations: Map<string, Function>;
        /** Metadata for supported languages */
        languagesMeta: LanguageMeta[];
        /** List of all available language codes */
        availableLanguages: string[];
        /** The fallback language code */
        fallbackLng: string;
        /** Base directory for translations */
        baseDir?: string;
        /** Plugins directory containing translations */
        pluginsDir?: string;
        /** Whether database sync is enabled */
        useDatabase: boolean;

        /** Initialize the translation system and load all resources
         * @returns A map of translation functions by language
         */
        initialize(): Promise<Map<string, Function>>;

        /** Translate a key to the target language
         * @param key The translation key to lookup
         * @param optionsOrLanguage Either interpolation options or target language
         * @param language Target language (when options provided)
         * @returns The translated string
         */
        tr(
            key: string,
            optionsOrLanguage?: Record<string, any> | string,
            language?: string,
        ): string;

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
        getResourceBundle(language: string, plugin: string, flatten?: boolean): ResourceBundle;

        /** Update translations for a plugin and language
         * @param plugin The plugin name
         * @param language The language code
         * @param data The new translation data
         */
        updateResourceBundle(plugin: string, language: string, data: ResourceBundle): Promise<void>;
    }

    export = I18nManager;
}
