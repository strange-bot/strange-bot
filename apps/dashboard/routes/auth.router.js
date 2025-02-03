const express = require("express");
const DiscordOauth2 = require("discord-oauth2");
const DBClient = require("strange-db-client");
const { encrypt } = require("../helpers/utils");

const router = express.Router();
const oauth = new DiscordOauth2();

const BASE_URL = process.env.DASHBOARD_BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Login page
router.get("/login", async function (req, res) {
    if (!req.session.user?.info?.id || !req.session.user?.guilds) {
        return res.redirect(
            `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify%20guilds%20email&response_type=code&redirect_uri=${encodeURIComponent(
                BASE_URL + "/auth/callback",
            )}&state=${req.query.state || "no"}`,
        );
    }
    res.redirect("/dashboard");
});

// Callback
router.get("/callback", async (req, res) => {
    if (!req.query.code) return res.redirect(BASE_URL);
    const db = DBClient.getInstance();
    const cached = await db.getFromCache(`dashboard:${req.query.state}`);
    const redirectURL = cached || "/dashboard";

    const tokens = await oauth
        .tokenRequest({
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            code: req.query.code,
            scope: "identify guilds email",
            grantType: "authorization_code",
            redirectUri: `${BASE_URL}/auth/callback`,
        })
        .catch((e) => {
            req.logger.error("Failed to get tokens");
            req.logger.error(e);
            return res.redirect(`/api/login&state=${req.query.state}`);
        });

    if (!tokens) return;

    const userData = {
        info: null,
        guilds: null,
    };
    while (!userData.info || !userData.guilds) {
        /* User info */
        if (!userData.info) {
            const user = await oauth.getUser(tokens.access_token);
            userData.info = user;
        }
        /* User guilds */
        if (!userData.guilds) {
            const guilds = await oauth.getUserGuilds(tokens.access_token);
            userData.guilds = guilds;
        }
    }

    // Update session
    req.session.user = userData;

    // Set locale
    const coreConfig = await db.getPluginConfig("core");
    const config = await db.getDashboardConfig(req.session.user.info.id);
    req.session.locale = config.locale || coreConfig["LOCALE"]["DEFAULT"];

    req.session.save((err) => {
        if (err) req.logger.error("Failed to save session", err);
    });

    // Update DB Login
    await db.dashboardLogin(req.session.user.info.id, {
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        expires: Date.now() + tokens.expires_in * 1000,
    });

    res.redirect(redirectURL);
});

// Logout
router.get("/logout", async function (req, res) {
    if (!req.user) return res.redirect(BASE_URL);
    const userId = req.user.info.id;
    req.session.destroy(async (err) => {
        if (err) {
            req.logger.error("Failed to destroy session: " + err);
            return res.redirect(BASE_URL);
        }

        await DBClient.getInstance().dashboardLogout(userId);
        res.redirect(BASE_URL);
    });
});

module.exports = router;
