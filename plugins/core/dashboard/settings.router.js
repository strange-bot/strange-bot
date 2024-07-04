const path = require("node:path");
const router = require("express").Router();

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "views/settings.ejs"), {
        languages: req.client.languages.map((lang) => lang.name),
    });
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("core");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        if (body.prefix && settings.prefix !== body.prefix) {
            settings.prefix = body.prefix;
        }

        if (body.locale) {
            if (!req.client.languages.find((lang) => lang.name === body.locale)) {
                return res.status(400).send("Invalid language");
            }
            if (settings.locale !== body.locale) {
                settings.locale = body.locale;
            }
        }

        await guild.updateSettings();
    }

    res.redirect("/dashboard/" + guild.id + "/core");
});

module.exports = router;
