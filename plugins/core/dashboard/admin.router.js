const path = require("path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "views", "admin.ejs"), {
        config: config.data,
        languages: req.client.languages.map((lang) => lang.name),
    });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // Server Config
    if (Object.prototype.hasOwnProperty.call(body, "server_config")) {
        if (
            (body.prefix && typeof body.prefix !== "string") ||
            (body.locale && typeof body.locale !== "string") ||
            (body.support_server && typeof body.support_server !== "string")
        ) {
            return res.status(400);
        }

        config.data.PREFIX_COMMANDS.DEFAULT_PREFIX = body.prefix;
        config.data.LOCALE.DEFAULT = body.locale;
        config.data.SUPPORT_SERVER = body.support_server;

        body.slash_commands = body.slash_commands === "on";
        config.data.INTERACTIONS.SLASH = body.slash_commands;

        body.context_menus = body.context_menus === "on";
        config.data.INTERACTIONS.CONTEXT = body.context_menus;

        await config.saveToDb();
    }

    // Dashboard Config
    if (Object.prototype.hasOwnProperty.call(body, "dash_config")) {
        if (
            (body.logo && typeof body.logo !== "string") ||
            (body.logo_url && typeof body.logo_url !== "string")
        ) {
            return res.status(400);
        }

        config.data.DASHBOARD.LOGO_NAME = body.logo;
        config.data.DASHBOARD.LOGO_URL = body.logo_url;

        await config.saveToDb();
    }

    res.redirect("/admin/core");
});

module.exports = router;
