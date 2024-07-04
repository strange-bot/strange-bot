const path = require("path");
const router = require("express").Router();

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("moderation");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        if (!body.log_channel) {
            settings.modlog_channel = null;
        } else {
            const logs_ch = guild.channels.cache.get(body.log_channel);
            if (logs_ch != settings.modlog_channel) {
                settings.modlog_channel = logs_ch.id;
            }
        }

        if (
            body.maxwarn_count &&
            !isNaN(body.maxwarn_count) &&
            body.maxwarn_count != settings.max_warn.limit
        ) {
            settings.max_warn.limit = Number(body.maxwarn_count);
        }

        if (body.maxwarn_action && body.maxwarn_action != settings.max_warn.action) {
            settings.max_warn.action = body.maxwarn_action;
        }

        await guild.updateSettings();
    }

    res.redirect("/dashboard/" + guild.id + "/moderation");
});

module.exports = router;
