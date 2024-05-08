const PluginManager = require("../../base/PluginManager");
const express = require("express");
const router = express.Router();

// Middlewares
const pluginMiddleware = require("../middlewares/plugin.middleware");

// Controllers
const indexController = require("../controllers/index.controller");
const homeController = require("../controllers/home.controller");

router.get("/", indexController);
router.get("/:serverId", homeController.get);
router.post("/:serverId", homeController.post);

PluginManager.plugins.forEach((plugin) => {
    if (plugin.dashboard.enabled) {
        router.use(
            `/:serverId/${plugin.name}`,
            (req, res, next) => {
                pluginMiddleware(req, res, next, plugin);
            },
            plugin.dashboard.router,
        );
    }
});

module.exports = router;
