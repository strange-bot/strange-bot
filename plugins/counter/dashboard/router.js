const path = require("path");
const router = require("express").Router();
const { setupCounter, removeCounter } = require("../handler");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("counter");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        let replyKeys = [];
        if (body.user_counter) {
            replyKeys.push(await setupCounter(guild, "USERS", body.user_counter, settings));
        } else {
            replyKeys.push(await removeCounter(guild, "USERS", settings));
        }

        if (body.member_counter) {
            replyKeys.push(await setupCounter(guild, "MEMBERS", body.member_counter, settings));
        } else {
            replyKeys.push(await removeCounter(guild, "MEMBERS", settings));
        }

        if (body.bot_counter) {
            replyKeys.push(await setupCounter(guild, "BOTS", body.bot_counter, settings));
        } else {
            replyKeys.push(await removeCounter(guild, "BOTS", settings));
        }

        // internal server error
        if (replyKeys.find((k) => k === "counter:FAILED")) {
            return res.status(500);
        }

        // bad request
        if (
            replyKeys.find(
                (k) =>
                    k !== "counter:CREATED" &&
                    k !== "counter:UPDATED" &&
                    k !== "counter:REMOVED" &&
                    k !== "counter:NOT_EXISTS",
            )
        ) {
            return res.status(400).send(
                replyKeys
                    .map((k) => {
                        return req.translate(k);
                    })
                    .join(", "),
            );
        }
    }

    res.redirect("/dashboard/" + guild.id + "/counter");
});

module.exports = router;
