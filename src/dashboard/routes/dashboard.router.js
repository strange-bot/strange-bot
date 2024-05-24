const PluginManager = require("../../base/PluginManager");
const express = require("express");
const router = express.Router();

// Middlewares
const pluginMiddleware = require("../middlewares/plugin.middleware");

// Controllers
const dashboardController = require("../controllers/dashboard.controller");

router.get("/", dashboardController.getSelector);
router.get("/:serverId", dashboardController.getPlugins);
router.post("/:serverId", dashboardController.postPlugins);

// Default GET, POST router for plugins with dashboard
const defaultRouter = () => {
    const router = express.Router();
    router.get("/", (_req, res) => {
        res.render("default_plugin");
    });

    router.post("/", (_req, res) => {
        return res.status(400).send("Not implemented");
    });

    return router;
};

PluginManager.plugins
    .filter((p) => !p.ownerOnly)
    .forEach((plugin) => {
        router.use(
            `/:serverId/${plugin.name}`,
            (req, res, next) => {
                pluginMiddleware(req, res, next, plugin);
            },
            plugin.dashboard.settingsRouter || defaultRouter(),
        );
    });

module.exports = router;
