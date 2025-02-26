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
module.exports.updatePlugins = async function (req, res) {
    const { pluginName, action } = req.body;
    try {
        switch (action) {
            case "enable":
                await req.app.pluginManager.enablePlugin(pluginName);
                break;
            case "disable":
                await req.app.pluginManager.disablePlugin(pluginName);
                break;
            case "install":
                await req.app.pluginManager.installPlugin(pluginName);
                break;
            case "uninstall":
                await req.app.pluginManager.uninstallPlugin(pluginName);
                break;
            case "update":
                if (req.app.pluginManager.isPluginEnabled(pluginName)) {
                    await req.app.pluginManager.disablePlugin(pluginName);
                }
                await req.app.pluginManager.uninstallPlugin(pluginName);
                await req.app.pluginManager.installPlugin(pluginName);
                break;
            default:
                throw new Error("Invalid action");
        }

        res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
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
