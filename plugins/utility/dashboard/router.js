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
        if (body.api_key && typeof body.api_key !== "string") {
            return res.status(400);
        }

        config.set("WEATHERSTACK_KEY", body.api_key);
        await config.saveToDb();
    }

    res.redirect("/admin/utility");
});

module.exports = router;
