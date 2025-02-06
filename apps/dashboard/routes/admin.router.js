const express = require("express");
const router = express.Router();

// Controllers
const adminController = require("../controllers/admin.controller");

// Middlewares
const pluginMiddleware = require("../middlewares/context/plugin.middleware");

router.get("/", adminController.get);
router.post("/", adminController.post);

router.use("/:pluginName", pluginMiddleware.admin, (req, res, next) => {
    const plugin = res.locals.plugin;
    if (!plugin.adminRouter) {
        return next();
    }

    return plugin.adminRouter(req, res, next);
});

module.exports = router;
