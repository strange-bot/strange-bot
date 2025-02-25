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
