const express = require("express");
const router = express.Router();

// Controllers
const adminController = require("../controllers/admin.controller");

// Middlewares
const pluginMiddleware = require("../middlewares/context/plugin.middleware");

// Routes
router.get("/", adminController.getHome);
router.get("/locales", adminController.getLocales);
router.get("/api/locales", adminController.getBotLocales);
router.put("/api/locales", adminController.updateBotLocales);

// Plugin management routes
router.get("/plugins", adminController.getPlugins);
router.put("/plugins", adminController.updatePlugins);

// Landing config routes
router.get("/landing", adminController.getLandingConfig);
router.get("/landing/content", adminController.getLandingContent);
router.post("/landing", adminController.updateLandingConfig);

router.use("/:pluginName", pluginMiddleware.admin, (req, res, next) => {
    const plugin = res.locals.plugin;
    if (!plugin.adminRouter) {
        return next();
    }

    return plugin.adminRouter(req, res, next);
});

module.exports = router;
