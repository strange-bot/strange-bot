const { languagesMeta } = require("strange-core");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getHome = function (req, res) {
    const coreConfig = res.locals.coreConfig;

    res.render("admin/plugins", {
        coreConfig,
        tr: req.translate,
        user: req.session.user.info,

        layout: "layouts/admin",
        title: `Localization | ${coreConfig["DASHBOARD"]["LOGO_NAME"]}`,
        slug: "locales",
        breadcrumb: true,
        plugins: req.app.pluginManager.plugins,
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getPlugins = async function (req, res) {
    try {
        const plugins = await req.app.pluginManager.getPluginsMeta();
        return res.json(plugins);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.togglePlugin = async function (req, res) {
    const { pluginName, action } = req.params;
    try {
        if (action === "enable") {
            await req.app.pluginManager.enablePlugin(pluginName);
        } else {
            await req.app.pluginManager.disablePlugin(pluginName);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.installPlugin = async function (req, res) {
    const { pluginName } = req.params;
    try {
        await req.app.pluginManager.installPlugin(pluginName);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.uninstallPlugin = async function (req, res) {
    const { pluginName } = req.params;
    try {
        await req.app.pluginManager.uninstallPlugin(pluginName);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getLocales = async function (req, res) {
    const coreConfig = res.locals.coreConfig;

    const availableLanguages = languagesMeta.map((l) => ({
        name: l.nativeName,
        value: l.name,
    }));

    res.render("admin/locales", {
        coreConfig,
        tr: req.translate,
        user: req.session.user.info,

        layout: "layouts/admin",
        title: `Localization | ${coreConfig["DASHBOARD"]["LOGO_NAME"]}`,
        slug: "locales",
        breadcrumb: true,
        plugins: req.app.pluginManager.plugins,
        availableLanguages,
    });
};
