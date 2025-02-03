const express = require("express");
const router = express.Router();

// Controllers
const dashboardController = require("../controllers/dashboard.controller");

// Middlewares
const { guildContext, pluginContext } = require("../middlewares/context.middleware");

router.get("/", dashboardController.serverSelector);
router.get("/:guildId", guildContext, dashboardController.homePage);

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

router.use("/:guildId/:pluginName", guildContext, pluginContext, (req, res, next) => {
    (req.plugin.settingsRouter || defaultRouter())(req, res, next);
});

module.exports = router;
