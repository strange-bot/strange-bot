const PluginManager = require("../../base/PluginManager");
const express = require("express");
const router = express.Router();

// Middlewares
const adminMiddleware = require("../middlewares/admin.middleware");

// Controllers
const adminController = require("../controllers/admin.controller");

router.get("/", adminController.get);
router.post("/", adminController.post);

router.get("/localizationBundle", adminController.getLocalizationBundle);
router.put("/localizationBundle", adminController.updateLocalizationBundle);
router.get("/locales", adminController.getLocales);

PluginManager.plugins.forEach((plugin) => {
    if (plugin.dashboard.enabled && plugin.dashboard.adminRouter) {
        router.use(
            `/${plugin.name}`,
            (req, res, next) => {
                adminMiddleware(req, res, next, plugin);
            },
            plugin.dashboard.adminRouter,
        );
    }
});

module.exports = router;
