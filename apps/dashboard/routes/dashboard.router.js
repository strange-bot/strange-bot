const express = require("express");
const router = express.Router();

// Controllers
const dashboardController = require("../controllers/dashboard.controller");

// Middlewares
const guildMiddlware = require("../middlewares/context/guild.middleware");
const pluginMiddleware = require("../middlewares/context/plugin.middleware");

router.get("/", dashboardController.serverSelector);
router.get("/:guildId", guildMiddlware, dashboardController.homePage);
router.post("/:guildId", guildMiddlware, dashboardController.postPlugins);

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

router.use(
    "/:guildId/:pluginName",
    guildMiddlware,
    pluginMiddleware.dashboard,
    (req, res, next) => {
        const plugin = res.locals.plugin;
        if (plugin.dashboardRouter) {
            plugin.dashboardRouter(req, res, next);
        } else {
            defaultRouter()(req, res, next);
        }
    },
);

module.exports = router;
