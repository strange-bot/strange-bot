const express = require("express");
const router = express.Router();

// Controllers
const adminController = require("../controllers/admin.controller");

// Middlewares
const pluginMiddleware = require("../middlewares/context/plugin.middleware");

// Routes
router.get("/", adminController.getHome);
router.get("/locales", adminController.getLocales);

// Plugin management routes
router.get("/plugins", adminController.getPlugins);
router.post('/plugins/:pluginName/:action(enable|disable)', adminController.togglePlugin);
router.post('/plugins/:pluginName/install', adminController.installPlugin);
router.post('/plugins/:pluginName/uninstall', adminController.uninstallPlugin);

router.use("/:pluginName", pluginMiddleware.admin, (req, res, next) => {
    const plugin = res.locals.plugin;
    if (!plugin.adminRouter) {
        return next();
    }

    return plugin.adminRouter(req, res, next);
});

module.exports = router;
