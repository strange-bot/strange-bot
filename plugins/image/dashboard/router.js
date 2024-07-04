const path = require("path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "view.ejs"), {
        config: config.data,
    });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // Config
    if (Object.prototype.hasOwnProperty.call(body, "config")) {
        if (
            (body.embed_color && typeof body.embed_color !== "string") ||
            (body.api_url && typeof body.api_url !== "string") ||
            (body.api_key && typeof body.api_key !== "string")
        ) {
            return res.status(400);
        }

        config.set("EMBED_COLOR", body.embed_color);
        config.set("STRANGE_API_URL", body.api_url);
        config.set("STRANGE_API_KEY", body.api_key);
        await config.saveToDb();
    }

    res.redirect("/admin/image");
});

module.exports = router;
