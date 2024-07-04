const path = require("path");
const router = require("express").Router();

router.get("/", (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("automod");

    // Basic settings
    if (Object.prototype.hasOwnProperty.call(body, "basic_settings")) {
        if (!body.log_channel) {
            settings.log_channel = null;
        } else {
            const logs_ch = guild.channels.cache.get(body.log_channel);
            if (logs_ch != settings.log_channel) {
                settings.log_channel = logs_ch.id;
            }
        }

        if (body.max_strikes && body.max_strikes != settings.strikes) {
            settings.strikes = body.max_strikes;
        }

        if (body.automod_action && body.automod_action != settings.action) {
            settings.action = body.automod_action;
        }

        if (body.log_embed && body.log_embed != settings.embed_colors.log) {
            settings.embed_colors.log = body.log_embed;
        }

        if (body.dm_embed && body.dm_embed != settings.embed_colors.dm) {
            settings.embed_colors.dm = body.dm_embed;
        }

        if (!body.wh_channels) body.wh_channels = [];
        if (typeof body.wh_channels === "string") body.wh_channels = [body.wh_channels];
        body.wh_channels = body.wh_channels
            .map((c) => guild.channels.cache.get(c)?.id)
            .filter((c) => c);
        settings.wh_channels = body.wh_channels;
    }

    // Quick toggles
    if (Object.prototype.hasOwnProperty.call(body, "automod_toggle")) {
        if (body.max_lines && !isNaN(body.max_lines) && body.max_lines != settings.max_lines) {
            settings.max_lines = Number(body.max_lines);
        }

        body.debug = body.debug === "on" ? true : false;
        if (body.debug != settings.debug) {
            settings.debug = body.debug;
        }

        body.anti_attachments = body.anti_attachments === "on" ? true : false;
        if (body.anti_attachments != settings.anti_attachments) {
            settings.anti_attachments = body.anti_attachments;
        }

        body.anti_invites = body.anti_invites === "on" ? true : false;
        if (body.anti_invites != settings.anti_invites) {
            settings.anti_invites = body.anti_invites;
        }

        body.anti_links = body.anti_links === "on" ? true : false;
        if (body.anti_links != settings.anti_links) {
            settings.anti_links = body.anti_links;
        }

        body.anti_spam = body.anti_spam === "on" ? true : false;
        if (body.anti_spam != settings.anti_spam) {
            settings.anti_spam = body.anti_spam;
        }

        body.anti_ghostping = body.anti_ghostping === "on" ? true : false;
        if (body.anti_ghostping != settings.anti_ghostping) {
            settings.anti_ghostping = body.anti_ghostping;
        }

        body.anti_massmention = body.anti_massmention === "on" ? true : false;
        if (body.anti_massmention != settings.anti_massmention) {
            settings.anti_massmention = body.anti_massmention;
        }
    }

    await guild.updateSettings();
    res.redirect("/dashboard/" + guild.id + "/automod");
});

module.exports = router;
