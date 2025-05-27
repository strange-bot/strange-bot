const express = require("express");
const DiscordOauth2 = require("discord-oauth2");
const { encrypt } = require("../helpers/utils");
const db = require("../db.service");
const { URL } = require("url");

const router = express.Router();
const oauth = new DiscordOauth2();

const BASE_URL = process.env.DASHBOARD_BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Login page
router.get("/login", async function (req, res) {
    if (!req.session.user?.info?.id || !req.session.user?.guilds) {
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            scope: "identify guilds email",
            response_type: "code",
            redirect_uri: new URL("/auth/callback", BASE_URL).toString(),
            state: req.query.state || "no",
        });
        const url = new URL("https://discord.com/api/oauth2/authorize");
        url.search = params.toString();
        return res.redirect(url.toString());
    }
    res.redirect("/dashboard");
});

// Callback
router.get("/callback", async (req, res) => {
    if (!req.query.code) return res.redirect(BASE_URL);
    const cached = await db.getState(req.query.state);
    const redirectURL = cached || "/dashboard";

    const tokens = await oauth
        .tokenRequest({
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            code: req.query.code,
            scope: "identify guilds email",
            grantType: "authorization_code",
            redirectUri: new URL("/auth/callback", BASE_URL).toString(),
        })
        .catch((e) => {
            req.app.logger.error("Failed to get tokens", e);
            return res.redirect(`/auth/login?state=${req.query.state}`);
        });

    if (!tokens) return;

    const userData = {
        info: null,
        guilds: null,
    };
    try {
        userData.info = await oauth.getUser(tokens.access_token);
        userData.guilds = await oauth.getUserGuilds(tokens.access_token);
    } catch (err) {
        req.app.logger.error("Failed to fetch user info or guilds", err);
        return res.redirect(`/auth/login?state=${req.query.state}`);
    }
    // Update session
    req.session.user = userData;

    // Set locale
    const coreConfig = await req.app.pluginManager.getPlugin("core").getConfig();
    const dbLocale = await db.getLocale(req.session.user.info.id);
    req.session.locale = dbLocale || coreConfig["LOCALE"]["DEFAULT"] || "en-US";

    req.session.save((err) => {
        if (err) req.app.logger.error("Failed to save session", err);
    });

    // Update DB Login
    const tokenData = {
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        expires: Date.now() + tokens.expires_in * 1000,
    };

    await db.loginUser(req.session.user.info.id, tokenData);
    res.redirect(redirectURL);
});

// Logout
router.get("/logout", async function (req, res) {
    if (!req.session.user) return res.redirect(BASE_URL);
    const userId = req.session.user.info.id;
    req.session.destroy(async (err) => {
        if (err) {
            req.app.logger.error("Failed to destroy session: " + err);
            return res.redirect(BASE_URL);
        }

        await db.logoutUser(userId);
        res.redirect(BASE_URL);
    });
});

module.exports = router;
