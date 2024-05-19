const express = require("express");
const router = express.Router();

router.get("/", (_req, res) => {
    res.render("landing.html", {
        layout: false,
    });
});

module.exports = router;
