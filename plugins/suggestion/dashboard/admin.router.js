const path = require("path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "views/admin.ejs"), {
        config: config.data,
    });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // config
    if (Object.prototype.hasOwnProperty.call(body, "config")) {
        if (body.upvote_emoji && body.upvote_emoji !== config.get("UPVOTE_EMOJI")) {
            config.set("UPVOTE_EMOJI", body.upvote_emoji);
        }

        if (body.downvote_emoji && body.downvote_emoji !== config.get("DOWNVOTE_EMOJI")) {
            config.set("DOWNVOTE_EMOJI", body.downvote_emoji);
        }

        if (body.default_embed && body.default_embed !== config.get("DEFAULT_EMBED")) {
            config.set("DEFAULT_EMBED", body.default_embed);
        }

        if (body.approved_embed && body.approved_embed !== config.get("APPROVED_EMBED")) {
            config.set("APPROVED_EMBED", body.approved_embed);
        }

        if (body.rejected_embed && body.rejected_embed !== config.get("DENIED_EMBED")) {
            config.set("DENIED_EMBED", body.rejected_embed);
        }

        await config.saveToDb();
    }

    res.redirect("/admin/suggestion");
});

module.exports = router;
