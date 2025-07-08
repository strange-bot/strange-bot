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
        title: `Plugins | ${coreConfig["DASHBOARD"]["LOGO_NAME"]}`,
        slug: "admin",
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
            case "enable": {
                await req.app.pluginManager.enablePlugin(pluginName);
                const ipcResp = await req.app.ipcServer.broadcast("dashboard:UPDATE_PLUGIN", {
                    pluginName,
                    action,
                });
                if (ipcResp.find((r) => !r.success)) {
                    await req.app.pluginManager.disablePlugin(pluginName);
                    throw new Error("Failed to enable plugin on other instances");
                }
                break;
            }

            case "disable": {
                await req.app.pluginManager.disablePlugin(pluginName);
                const ipcResp = await req.app.ipcServer.broadcast("dashboard:UPDATE_PLUGIN", {
                    pluginName,
                    action,
                });
                if (ipcResp.find((r) => !r.success)) {
                    await req.app.pluginManager.enablePlugin(pluginName);
                    throw new Error("Failed to disable plugin on other instances");
                }
                break;
            }

            case "install": {
                const botResp = await req.app.ipcServer.broadcastOne("dashboard:UPDATE_PLUGIN", {
                    pluginName,
                    action: "install",
                });
                if (!botResp?.success) {
                    throw new Error("Failed to install plugin on bot instance");
                }
                await req.app.pluginManager.installPlugin(pluginName);
                break;
            }

            case "uninstall": {
                const ipcResp = await req.app.ipcServer.broadcastOne("dashboard:UPDATE_PLUGIN", {
                    pluginName,
                    action,
                });
                if (!ipcResp?.success) {
                    throw new Error("Failed to uninstall plugin on other instances");
                }
                await req.app.pluginManager.uninstallPlugin(pluginName);
                break;
            }

            case "update": {
                if (req.app.pluginManager.isPluginEnabled(pluginName)) {
                    await req.app.pluginManager.disablePlugin(pluginName);
                    const ipcResp = await req.app.ipcServer.broadcast("dashboard:UPDATE_PLUGIN", {
                        pluginName,
                        action: "disable",
                    });
                    if (ipcResp.find((r) => !r.success)) {
                        await req.app.pluginManager.enablePlugin(pluginName);
                        throw new Error("Failed to disable plugin for update");
                    }
                }
                await req.app.pluginManager.updatePlugin(pluginName);
                break;
            }

            default:
                throw new Error("Invalid action");
        }

        res.sendStatus(200);
    } catch (error) {
        req.app.logger.error("updatePlugins", error);
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
