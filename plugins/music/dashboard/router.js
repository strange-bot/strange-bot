const path = require("path");
const router = require("express").Router();
const config = require("../config");

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "view.ejs"), {
        config: config.data,
    });
});

router.post("/", async (req, res) => {
    const body = req.body;

    // Config
    if (Object.prototype.hasOwnProperty.call(body, "config")) {
        if (
            body.idle_time &&
            !isNaN(body.idle_time) &&
            body.idle_time !== config.get("IDLE_TIME")
        ) {
            config.set("IDLE_TIME", body.idle_time);
        }

        if (body.source && body.source !== config.get("DEFAULT_SOURCE")) {
            config.set("DEFAULT_SOURCE", body.source);
        }

        if (body.client_id && body.client_id !== config.get("SPOTIFY").CLIENT_ID) {
            config.data.SPOTIFY.CLIENT_ID = body.client_id;
        }

        if (body.client_secret && body.client_secret !== config.get("SPOTIFY").CLIENT_SECRET) {
            config.data.SPOTIFY.CLIENT_SECRET = body.client_secret;
        }

        await config.saveToDb();
    }

    // Add Node
    if (Object.prototype.hasOwnProperty.call(body, "add_node")) {
        const node = {
            host: body.node_host,
            port: body.node_port,
            password: body.node_pass,
            id: body.node_id,
            secure: body.is_secure === "true",
        };
        config.set("LAVALINK_NODES", [...config.data.LAVALINK_NODES, node]);
        await config.saveToDb();
    }

    // Delete Node
    if (Object.prototype.hasOwnProperty.call(body, "delete_node")) {
        const nodeHost = body.node_host;
        config.set(
            "LAVALINK_NODES",
            config.data.LAVALINK_NODES.filter((node) => node.host !== nodeHost),
        );
        await config.saveToDb();
    }

    res.redirect("/admin/music");
});

module.exports = router;
