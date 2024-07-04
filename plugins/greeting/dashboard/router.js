const path = require("path");
const router = require("express").Router();

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "view.ejs"), {
        tabs: ["Autorole"],
    });
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("greeting");

    if (Object.prototype.hasOwnProperty.call(body, "welcome_disable")) {
        settings.welcome.enabled = false;
        settings.welcome.channel = null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "farewell_disable")) {
        settings.farewell.enabled = false;
        settings.farewell.channel = null;
    }

    // Welcome settings
    if (
        Object.prototype.hasOwnProperty.call(body, "welcome_enable") ||
        Object.prototype.hasOwnProperty.call(body, "welcome_update")
    ) {
        if (Object.prototype.hasOwnProperty.call(body, "welcome_enable")) {
            settings.welcome.enabled = true;
        }

        if (body.welcome_channel && body.welcome_channel !== settings.welcome.channel) {
            if (!res.locals.guild.channels.cache.has(body.welcome_channel)) {
                return res.status(400).send("Invalid channel");
            }
            settings.welcome.enabled = true;
            settings.welcome.channel = body.welcome_channel;
        }

        if (body.welcome_content) {
            body.welcome_content = body.welcome_content.trim().replace(/\r?\n/g, "\\n");
            if (body.welcome_content !== settings.welcome.content) {
                settings.welcome.content = body.welcome_content;
            }
        }

        if (body.welcome_embed_content) {
            body.welcome_embed_content = body.welcome_embed_content.trim().replace(/\r?\n/g, "\\n");
            if (body.welcome_embed_content !== settings.welcome.embed.description) {
                settings.welcome.embed.description = body.welcome_embed_content;
            }
        }

        if (body.welcome_embed_footer) {
            body.welcome_embed_footer = body.welcome_embed_footer.trim();
            if (body.welcome_embed_footer !== settings.welcome.embed.footer) {
                settings.welcome.embed.footer = body.welcome_embed_footer;
            }
        }

        if (body.welcome_embed_thumbnail) {
            const status = body.welcome_embed_thumbnail === "on";
            if (status !== settings.welcome.embed.thumbnail) {
                settings.welcome.embed.thumbnail = status;
            }
        }

        if (body.welcome_embed_color && body.welcome_embed_color !== settings.welcome.embed.color) {
            settings.welcome.embed.color = body.welcome_embed_color;
        }

        if (body.welcome_embed_image && body.welcome_embed_image !== settings.welcome.embed.image) {
            settings.welcome.embed.image = body.welcome_embed_image;
        }
    }

    // Farewell settings
    if (
        Object.prototype.hasOwnProperty.call(body, "farewell_enable") ||
        Object.prototype.hasOwnProperty.call(body, "farewell_update")
    ) {
        if (Object.prototype.hasOwnProperty.call(body, "farewell_enable")) {
            settings.farewell.enabled = true;
        }

        if (body.farewell_channel && body.farewell_channel !== settings.farewell.channel) {
            if (!res.locals.guild.channels.cache.has(body.farewell_channel)) {
                return res.status(400).send("Invalid channel");
            }
            settings.farewell.channel = body.farewell_channel;
        }

        if (body.farewell_content) {
            body.farewell_content = body.farewell_content.trim().replace(/\r?\n/g, "\\n");
            if (body.farewell_content !== settings.farewell.content) {
                settings.farewell.content = body.farewell_content;
            }
        }

        if (body.farewell_embed_content) {
            body.farewell_embed_content = body.farewell_embed_content
                .trim()
                .replace(/\r?\n/g, "\\n");
            if (body.farewell_embed_content !== settings.farewell.embed.description) {
                settings.farewell.embed.description = body.farewell_embed_content;
            }
        }

        if (body.farewell_embed_footer) {
            body.farewell_embed_footer = body.farewell_embed_footer.trim();
            if (body.farewell_embed_footer !== settings.farewell.embed.footer) {
                settings.farewell.embed.footer = body.farewell_embed_footer;
            }
        }

        if (body.farewell_embed_thumbnail) {
            const status = body.farewell_embed_thumbnail === "on";
            if (status !== settings.farewell.embed.thumbnail) {
                settings.farewell.embed.thumbnail = status;
            }
        }

        if (
            body.farewell_embed_color &&
            body.farewell_embed_color !== settings.farewell.embed.color
        ) {
            settings.farewell.embed.color = body.farewell_embed_color;
        }

        if (
            body.farewell_embed_image &&
            body.farewell_embed_image !== settings.farewell.embed.image
        ) {
            settings.farewell.embed.image = body.farewell_embed_image;
        }
    }

    // Autorole settings
    if (Object.prototype.hasOwnProperty.call(body, "autorole")) {
        // validations
        if (!body.role_id) return res.status(400).send("No role provided");
        const roleId = guild.roles.cache.get(body.role_id)?.id;
        if (!roleId) return res.status(400).send("Invalid role provided");

        if (roleId != settings.autorole_id) {
            settings.autorole_id = roleId;
        }
    }

    await guild.updateSettings();
    res.redirect("/dashboard/" + guild.id + "/greeting");
});

module.exports = router;
