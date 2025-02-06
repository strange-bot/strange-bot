const path = require("path");
const router = require("express").Router();
const languages = require("strange-i18n/languages-meta.json");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views", "admin.ejs"), {
        config: res.locals.config,
        languages: languages.map((lang) => lang.name),
    });
});

router.post("/", async (req, res) => {
    const body = req.body;
    const { plugin, config } = res.locals;

    // Server Config
    if (Object.prototype.hasOwnProperty.call(body, "server_config")) {
        if (
            (body.prefix && typeof body.prefix !== "string") ||
            (body.locale && typeof body.locale !== "string") ||
            (body.support_server && typeof body.support_server !== "string")
        ) {
            return res.status(400);
        }

        config.PREFIX_COMMANDS.DEFAULT_PREFIX = body.prefix;
        config.LOCALE.DEFAULT = body.locale;
        config.SUPPORT_SERVER = body.support_server;

        body.slash_commands = body.slash_commands === "on";
        config.INTERACTIONS.SLASH = body.slash_commands;

        body.context_menus = body.context_menus === "on";
        config.INTERACTIONS.CONTEXT = body.context_menus;

        await plugin.setConfig(config);
    }

    // Dashboard Config
    if (Object.prototype.hasOwnProperty.call(body, "dash_config")) {
        if (
            (body.logo && typeof body.logo !== "string") ||
            (body.logo_url && typeof body.logo_url !== "string")
        ) {
            return res.status(400);
        }

        config.DASHBOARD.LOGO_NAME = body.logo;
        config.DASHBOARD.LOGO_URL = body.logo_url;

        await plugin.setConfig(config);
    }

    res.redirect("/admin/core");
});

module.exports = router;
