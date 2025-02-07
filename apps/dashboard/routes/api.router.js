const express = require("express");
const router = express.Router();

// Controllers
const apiController = require("../controllers/api.controller");

// Routes
router.get("/locales", apiController.getBotLocales);
router.put("/locales", apiController.updateBotLocales);
router.put("/language", apiController.updateDashboardLanguage);

module.exports = router;
