const path = require("node:path");
const router = require("express").Router();
const ems = require("enhanced-ms");

const start = require("../commands/sub/start");
const pause = require("../commands/sub/pause");
const resume = require("../commands/sub/resume");
const end = require("../commands/sub/end");

router.get("/", (req, res) => {
    const giveaways = req.client.giveawaysManager.giveaways
        .filter((g) => g.guildId === res.locals.guild.id && !g.ended)
        .map((g) => {
            // check if endAt is Inifinity
            g.timeRemaining = g.endAt !== Infinity ? ems(g.endAt - Date.now(), { shortFormat: true }): "∞";
            return g;
        });

    res.render(path.join(__dirname, "views/settings.ejs"), {
        giveaways,
        tabs: [req.translate("giveaways:DASH.LIST_TITLE")],
    });
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("giveaways");

    // settings
    if (Object.prototype.hasOwnProperty.call(body, "settings")) {
        if (body.reaction && body.reaction !== settings.reaction) {
            settings.reaction = body.reaction;
        }

        if (body.start_embed_color && body.start_embed_color !== settings.start_embed_color) {
            settings.start_embed_color = body.start_embed_color;
        }

        if (body.end_embed_color && body.end_embed_color !== settings.end_embed_color) {
            settings.end_embed_color = body.end_embed_color;
        }

        await guild.updateSettings();
    }

    // create
    if (Object.prototype.hasOwnProperty.call(body, "create_giveaway")) {
        const member = guild.members.cache.get(req.user.infos.id);
        const channel = guild.channels.cache.get(body.channel);

        await start(
            member,
            channel,
            body.duration,
            body.prize,
            Number(body.winners),
            body.host,
            body.member_roles,
        );
    }

    // pause
    if (Object.prototype.hasOwnProperty.call(body, "pause_giveaway")) {
        const member = guild.members.cache.get(req.user.infos.id);
        await pause(member, body.message_id);
    }

    // resume
    if (Object.prototype.hasOwnProperty.call(body, "resume_giveaway")) {
        const member = guild.members.cache.get(req.user.infos.id);
        await resume(member, body.message_id);
    }

    // end
    if (Object.prototype.hasOwnProperty.call(body, "end_giveaway")) {
        const member = guild.members.cache.get(req.user.infos.id);
        await end(member, body.message_id);
    }

    res.redirect("/dashboard/" + guild.id + "/giveaways");
});

module.exports = router;
