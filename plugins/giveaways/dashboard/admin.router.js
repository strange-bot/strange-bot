const path = require("node:path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views/admin.ejs"), {
        config: config.data,
    });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // config
    if (Object.prototype.hasOwnProperty.call(body, "config")) {
        if (body.reaction && body.reaction !== config.get("DEFAULT_EMOJI")) {
            config.set("DEFAULT_EMOJI", body.reaction);
        }

        if (body.start_embed_color && body.start_embed_color !== config.get("START_EMBED_COLOR")) {
            config.set("START_EMBED_COLOR", body.start_embed_color);
        }

        if (body.end_embed_color && body.end_embed_color !== config.get("END_EMBED_COLOR")) {
            config.set("END_EMBED_COLOR", body.end_embed_color);
        }

        await config.saveToDb();
    }

    res.redirect("/admin/giveaways");
});

module.exports = router;
