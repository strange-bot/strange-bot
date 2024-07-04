const path = require("path");
const router = require("express").Router();

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "views", "settings.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("economy");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        if (
            (body.currency && typeof body.currency !== "string") ||
            (body.daily_coins && isNaN(body.daily_coins)) ||
            (body.min_beg_amount && isNaN(body.min_beg_amount)) ||
            (body.max_beg_amount && isNaN(body.max_beg_amount))
        ) {
            return res.status(400);
        }

        settings.currency = body.currency;
        settings.daily_coins = Number(body.daily_coins);
        settings.min_beg_amount = Number(body.min_beg_amount);
        settings.max_beg_amount = Number(body.max_beg_amount);

        await guild.updateSettings();
    }

    res.redirect("/dashboard/" + guild.id + "/economy");
});

module.exports = router;
