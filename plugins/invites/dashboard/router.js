const path = require("path");
const router = require("express").Router();

router.get("/", (req, res) => {
    const ranks = res.locals.settings.ranks.filter((rank) =>
        res.locals.guild.roles.cache.has(rank._id),
    );

    const ranksData = ranks.map((rank) => {
        const role = res.locals.guild.roles.cache.get(rank._id);
        return {
            id: rank._id,
            name: role.name,
            invites: rank.invites,
        };
    });

    res.render(path.join(__dirname, "view.ejs"), { ranks: ranksData });
});

router.post("/", async (req, res) => {
    const guild = res.locals.guild;
    const body = req.body;
    const settings = guild.getSettings("invites");

    if (Object.prototype.hasOwnProperty.call(body, "add_rank")) {
        if (isNaN(body.invites) || !body.role_id || !guild.roles.cache.has(body.role_id)) {
            return res.status(400).send("Invalid data");
        }

        if (settings.ranks.find((rank) => rank._id === body.role_id)) {
            return res.status(400).send("Role already exists");
        }

        settings.ranks.push({ invites: body.invites, _id: body.role_id });
    }
    if (Object.prototype.hasOwnProperty.call(body, "edit_rank")) {
        if (isNaN(body.invites) || !guild.roles.cache.has(body.role_id)) {
            return res.status(400).send("Invalid data");
        }

        const rank = settings.ranks.find((rank) => rank._id === body.role_id);
        if (!rank) {
            return res.status(400).send("Role not found");
        }

        if (rank.invites !== body.invites) rank.invites = body.invites;
        if (rank._id !== body.role_id) rank._id = body.role_id;
    }
    if (Object.prototype.hasOwnProperty.call(body, "delete_rank")) {
        if (!guild.roles.cache.has(body.role_id)) {
            return res.status(400).send("Invalid data");
        }

        settings.ranks = settings.ranks.filter((rank) => rank._id !== body.role_id);
    }

    guild.updateSettings();
    res.redirect("/dashboard/" + guild.id + "/invites");
});

module.exports = router;
