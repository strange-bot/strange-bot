const path = require("node:path");
const router = require("express").Router();
const events = require("../events");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "view.ejs"), {
        events,
    });
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("event-logger");

    if (!events.find((e) => e === body.event_name)) {
        return res.status(400).send("Invalid event name");
    }

    const config = settings.events.find((e) => e.name === body.event_name);

    // Disable event
    if (Object.prototype.hasOwnProperty.call(body, "event_disable")) {
        if (config) config.enabled = false;
    }

    // Enable or update event
    if (
        Object.prototype.hasOwnProperty.call(body, "event_enable") ||
        Object.prototype.hasOwnProperty.call(body, "event_update")
    ) {
        const logCh = body.log_channel ? guild.channels.cache.get(body.log_channel)?.id : null;
        if (!config) {
            settings.events.push({
                name: body.event_name,
                enabled: true,
                log_channel: logCh || "",
            });
        } else {
            config.enabled = true;
            config.log_channel = logCh || "";
        }
    }

    await guild.updateSettings();
    res.redirect("/dashboard/" + guild.id + "/event-logger");
});

module.exports = router;
