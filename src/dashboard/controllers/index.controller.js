const PluginManager = require("../../base/PluginManager");
const config = require("../../config");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports = async function (req, res) {
    const plugins = PluginManager.plugins;
    res.render("index", {
        slug: "dashboard",
        config,
        user: req.user,
        plugins,
        tr: req.translate,

        layout: "layouts/dashboard",
        title: `Server Selector | ${config.DASHBOARD.LOGO_NAME}`,
        breadcrumb: true,
        guilds: req.guilds,
    });
};
