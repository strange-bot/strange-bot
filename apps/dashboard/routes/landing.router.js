const express = require("express");
const router = express.Router();

// Controllers
const landingController = require("../controllers/landing.controller");

router.get("/", landingController.get);

module.exports = router;
