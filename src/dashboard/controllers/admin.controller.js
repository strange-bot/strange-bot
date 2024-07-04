const { sanitize } = require("isomorphic-dompurify");
const fs = require("node:fs");
const path = require("node:path");
const { flattenObject } = require("../utils");
const { updateResourceBundle } = require("../../utils/i18n");
const i18next = require("i18next");
const { get: getConfig } = require("../config");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.get = async function (req, res) {
    const { html, css, js } = getConfig().config;

    const plugins = req.client.pluginManager.plugins.filter(
        (p) => p.dashboard.enabled && p.dashboard.adminRouter !== undefined,
    );

    const coreConfig = req.client.coreConfig;

    res.render("admin", {
        coreConfig,
        tr: req.translate,
        user: req.user,

        layout: "layouts/admin",
        title: `Settings | ${coreConfig.get("DASHBOARD").LOGO_NAME}`,
        slug: "admin",
        breadcrumb: true,

        plugins,
        html,
        js,
        css,

        stylesheets: [
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css",
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/material-darker.min.css",
        ],

        scripts: [
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/xml/xml.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/javascript/javascript.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/css/css.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/htmlmixed/htmlmixed.min.js",
            "/js/codemirror.js",
        ],
    });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.post = async function (req, res) {
    try {
        const { html, css, js } = req.body;

        // Sanitize the HTML content
        const sanitizedHtml = sanitize(html, {
            WHOLE_DOCUMENT: true,
            ADD_TAGS: ["script", "link", "meta"],
            ADD_ATTR: ["charset", "name", "content"],
        });

        // Sanitize the CSS and JS content (as plain text, basic sanitization)
        const sanitizedCss = sanitize(css, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: {},
        });

        const sanitizedJs = sanitize(js, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: {},
        });

        const htmlFilePath = path.join(__dirname, "../views/landing.html");
        const cssFilePath = path.join(__dirname, "../public/css/landing.css");
        const jsFilePath = path.join(__dirname, "../public/js/landing.js");

        // Write the sanitized content to the respective files
        fs.writeFileSync(htmlFilePath, sanitizedHtml);
        fs.writeFileSync(cssFilePath, sanitizedCss);
        fs.writeFileSync(jsFilePath, sanitizedJs);

        // Save to mongo
        const dbConfig = getConfig();
        dbConfig.config.html = sanitizedHtml;
        dbConfig.config.css = sanitizedCss;
        dbConfig.config.js = sanitizedJs;
        await dbConfig.save();

        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getLocalizationBundle = async function (req, res) {
    const availableLanguages = req.client.languages.map((l) => l.name);
    const resourceBundle = {};
    for (const plugin of req.client.pluginManager.plugins) {
        const pluginName = plugin.name;
        for (const language of availableLanguages) {
            const bundle = i18next.getResourceBundle(language, pluginName) || {};
            resourceBundle[pluginName] = resourceBundle[pluginName] || {};
            resourceBundle[pluginName][language] = flattenObject(bundle);
        }
    }
    return res.json(resourceBundle);
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.updateLocalizationBundle = async function (req, res) {
    const { plugin, language, keys } = req.body;

    // Validate request keys
    const existingResource = i18next.getResourceBundle(language, plugin) || {};
    const existingKeys = Object.keys(flattenObject(existingResource));
    const newKeys = Object.keys(keys);

    if (existingKeys.length !== newKeys.length || !newKeys.every((k) => existingKeys.includes(k))) {
        return res.status(400).json({
            success: false,
            message: "Oops! Some keys are missing or invalid",
        });
    }

    await updateResourceBundle(plugin, language, keys);
    res.json({ success: true, message: "Localization keys updated successfully" });
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getLocales = async function (req, res) {
    const coreConfig = req.client.coreConfig;
    const plugins = req.client.pluginManager.plugins.filter(
        (p) => p.dashboard.enabled && p.dashboard.adminRouter !== undefined,
    );

    res.render("locales", {
        coreConfig,
        tr: req.translate,
        user: req.user,

        layout: "layouts/admin",
        title: `Localization | ${coreConfig.get("DASHBOARD").LOGO_NAME}`,
        slug: "locales",
        breadcrumb: true,
        plugins,

        availablePlugins: req.client.pluginManager.plugins.map((p) => p.name),
        availableLanguages: req.client.languages.map((l) => ({
            name: l.nativeName,
            value: l.name,
        })),

        scripts: ["/js/plugin-localization.js"],
    });
};
