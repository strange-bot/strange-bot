const { sanitize } = require("isomorphic-dompurify");
const fs = require("node:fs");
const path = require("node:path");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.get = async function (req, res) {
    const html = fs.readFileSync(path.join(__dirname, "../views/landing.html"), "utf8");
    const js = fs.readFileSync(path.join(__dirname, "../public/js/landing.js"), "utf8");
    const css = fs.readFileSync(path.join(__dirname, "../public/css/landing.css"), "utf8");

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
            "js/codemirror.js",
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

        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};
