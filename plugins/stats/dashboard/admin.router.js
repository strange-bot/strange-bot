const path = require("path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views/admin.ejs"), {
        config: config.data,
    });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // Config
    if (Object.prototype.hasOwnProperty.call(body, "config")) {
        if (
            (body.message && typeof body.message !== "string") ||
            (body.api_url && typeof body.api_url !== "string") ||
            (body.api_key && typeof body.api_key !== "string")
        ) {
            return res.status(400);
        }

        config.set("LEVEL_UP_MESSAGE", body.message);
        config.set("STRANGE_API_URL", body.api_url);
        config.set("STRANGE_API_KEY", body.api_key);

        await config.saveToDb();
    }

    res.redirect("/admin/stats");
});

module.exports = router;
