const path = require("path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views", "admin.ejs"), { config: config.data });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "config")) {
        if (
            (body.currency && typeof body.currency !== "string") ||
            (body.daily_coins && isNaN(body.daily_coins)) ||
            (body.min_beg_amount && isNaN(body.min_beg_amount)) ||
            (body.max_beg_amount && isNaN(body.max_beg_amount)) ||
            (body.beg_interval && isNaN(body.beg_interval))
        ) {
            return res.status(400);
        }

        config.set("CURRENCY", body.currency);
        config.set("DAILY_COINS", body.daily_coins);
        config.set("MIN_BEG_AMOUNT", body.min_beg_amount);
        config.set("MAX_BEG_AMOUNT", body.max_beg_amount);
        config.set("BEG_INTERVAL", body.beg_interval);

        await config.saveToDb();
    }

    res.redirect("/admin/economy");
});

module.exports = router;
