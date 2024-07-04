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
            (body.status && typeof body.status !== "string") ||
            (body.type && typeof body.type !== "string") ||
            (body.message && typeof body.message !== "string")
        ) {
            return res.status(400);
        }

        config.set("STATUS", body.status);
        config.set("TYPE", body.type);
        config.set("MESSAGE", body.message);

        await config.saveToDb();
    }

    res.redirect("/admin/guild-logger");
});

module.exports = router;
