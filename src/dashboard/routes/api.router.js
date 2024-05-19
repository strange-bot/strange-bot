const express = require("express");
const router = express.Router();
const DBModel = require("../../schemas/Dashboard");

router.post("/language", async (req, res) => {
    const lang = req.body.language_code;

    // check if language is valid
    if (!req.client.languages.find((l) => l.name === lang)) {
        return res.sendStatus(400);
    }

    if (!req.session.locale === lang) {
        return res.sendStatus(200);
    }

    const user = await DBModel.get(req.session.user.infos.id);
    user.locale = lang;
    await user.save();

    req.session.locale = lang;
    req.session.save(async (err) => {
        if (err) {
            req.client.logger.error("Failed to save session: " + err);
            return res.sendStatus(500);
        }

        res.sendStatus(200);
    });
});

module.exports = router;
