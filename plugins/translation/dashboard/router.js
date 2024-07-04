const path = require("path");
const router = require("express").Router();

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("translation");

    // Quick toggles
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        body.flag_tr = body.flag_tr === "on" ? true : false;
        if (body.flag_tr != settings.flag_translation) {
            settings.flag_translation = body.flag_tr;
        }

        await guild.updateSettings();
    }

    res.redirect("/dashboard/" + guild.id + "/translate");
});

module.exports = router;
