const express = require("express");
const router = express.Router();

// Controllers
const apiController = require("../controllers/api.controller");

// Routes
router.get("/health", apiController.getHealth);
router.get("/stats", apiController.getStats);

module.exports = router;
