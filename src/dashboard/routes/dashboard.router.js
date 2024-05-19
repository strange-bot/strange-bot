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

PluginManager.plugins.forEach((plugin) => {
    if (plugin.dashboard.enabled && plugin.dashboard.settingsRouter) {
        router.use(
            `/:serverId/${plugin.name}`,
            (req, res, next) => {
                pluginMiddleware(req, res, next, plugin);
            },
            plugin.dashboard.settingsRouter,
        );
    }
});

module.exports = router;
