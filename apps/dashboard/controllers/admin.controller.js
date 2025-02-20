const languages = require("strange-i18n/languages-meta.json");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getHome = async function (_req, res) {
    return res.redirect(`/admin/locales`);
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getLocales = async function (req, res) {
    const coreConfig = res.locals.coreConfig;

    const availableLanguages = languages.map((l) => ({
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
