const path = require("path");
const router = require("express").Router();

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views/settings.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("stats");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        const xp_ch = body.xp_channel ? guild.channels.cache.get(body.xp_channel)?.id : null;
        if (xp_ch != settings.xp.channel) {
            settings.xp.channel = xp_ch;
        }

        if (body.cooldown && !isNaN(body.cooldown) && body.cooldown != settings.xp.cooldown) {
            settings.xp.cooldown = Number(body.cooldown);
        }

        if (body.xp_message && body.xp_message != settings.xp.message) {
            settings.xp.message = body.xp_message;
        }

        await guild.updateSettings();
    }

    res.redirect("/dashboard/" + guild.id + "/stats");
});

module.exports = router;
