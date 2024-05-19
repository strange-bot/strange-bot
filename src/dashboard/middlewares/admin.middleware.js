/**
 * Middleware to check if the user is logged in
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {import('strange-sdk').Plugin} plugin
 */
module.exports = async (req, res, next, plugin) => {
    const config = req.client.coreConfig;
    const title =
        plugin.name.charAt(0).toUpperCase() +
        plugin.name.slice(1) +
        " | " +
        config.get("DASHBOARD").LOGO_NAME;

    const plugins = req.client.pluginManager.plugins.filter(
        (plugin) => plugin.dashboard.enabled && plugin.dashboard.adminRouter !== undefined,
    );

    res.locals.tr = req.translate;
    res.locals.coreConfig = config;
    res.locals.user = req.user;
    res.locals.plugins = plugins;
    res.locals.plugin = plugin;

    res.locals.title = title;
    res.locals.slug = `/plugins/${plugin.name}`;
    res.locals.breadcrumb = true;
    res.locals.layout = "layouts/admin";

    return next();
};
