const path = require("path");
const router = require("express").Router();

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views/settings.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("suggestion");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        if (body.upvote_emoji && body.upvote_emoji !== settings.upvote_emoji) {
            settings.upvote_emoji = body.upvote_emoji;
        }

        if (body.downvote_emoji && body.downvote_emoji !== settings.downvote_emoji) {
            settings.downvote_emoji = body.downvote_emoji;
        }

        if (body.default_ch) {
            const ch = guild.channels.cache.get(body.default_ch);
            if (!ch) return res.status(400).send("Invalid channel ID");
            settings.channel_id = ch.id;
        }

        if (body.default_embed && body.default_embed !== settings.default_embed) {
            settings.default_embed = body.default_embed;
        }

        if (body.approved_ch) {
            const ch = guild.channels.cache.get(body.approved_ch);
            if (!ch) return res.status(400).send("Invalid channel ID");
            settings.approved_channel = ch.id;
        }

        if (body.approved_embed && body.approved_embed !== settings.approved_embed) {
            settings.approved_embed = body.approved_embed;
        }

        if (body.rejected_ch) {
            const ch = guild.channels.cache.get(body.rejected_ch);
            if (!ch) return res.status(400).send("Invalid channel ID");
            settings.rejected_channel = ch.id;
        }

        if (body.rejected_embed && body.rejected_embed !== settings.rejected_embed) {
            settings.rejected_embed = body.rejected_embed;
        }

        if (body.staff_roles) {
            body.staff_roles = Array.isArray(body.staff_roles)
                ? body.staff_roles
                : [body.staff_roles];
            const validRoles = body.staff_roles.filter((r) => guild.roles.cache.has(r));
            settings.staff_roles = validRoles;
        }

        await guild.updateSettings();
    }

    res.redirect("/dashboard/" + guild.id + "/suggestion");
});

module.exports = router;
