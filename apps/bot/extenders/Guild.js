const { Guild } = require("discord.js");
const DBClient = require("strange-db-client");

/**
 * Returns the translation for the provided key
 * @param {string} key - The translation key
 * @param {object} args - The translation arguments
 */
Guild.prototype.getT = function (key, args) {
    // TODO: Set this property on guild or fetch from client.locale
    const locale = this.locale || "en-US";
    const tFunction = this.client.translations.get(locale);
    return tFunction(key, args);
};

Guild.prototype.getEnabledPlugins = async function () {
    const allSettings = await DBClient.getInstance().getSettings(this.id);
    return Object.entries(allSettings.plugins)
        .filter(([_, value]) => value.enabled === true)
        .map(([key]) => key);
};

Guild.prototype.getSettings = async function (pluginName) {
    return await DBClient.getInstance().getPluginSettings(this.id, pluginName);
};

Guild.prototype.updateSettings = async function (pluginName, settings) {
    return await DBClient.getInstance().updatePluginSettings(this.id, pluginName, settings);
};
