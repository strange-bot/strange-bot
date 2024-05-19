const express = require("express");
const DiscordOauth2 = require("discord-oauth2");
const DBModel = require("../../schemas/Dashboard");
const { encrypt } = require("../utils");

const router = express.Router();
const oauth = new DiscordOauth2();

const BASE_URL = process.env.BASE_URL;

// Gets login page
router.get("/login", async function (req, res) {
    if (!req.user || !req.user.id || !req.user.guilds) {
        // check if client user is ready
        if (!req.client.user?.id) {
            req.client.logger.debug("Client is not ready! Redirecting to /login");
            await req.client.wait(3000);
            return res.redirect("/login");
        }

        return res.redirect(
            `https://discord.com/api/oauth2/authorize?client_id=${
                req.client.user.id
            }&scope=identify%20guilds%20email&response_type=code&redirect_uri=${encodeURIComponent(
                BASE_URL + "/auth/callback",
            )}&state=${req.query.state || "no"}`,
        );
    }
    res.redirect("/dashboard");
});

// Callback
router.get("/callback", async (req, res) => {
    if (!req.query.code) return res.redirect(BASE_URL);
    if (req.query.state && req.query.state.startsWith("invite")) {
        if (req.query.code) {
            const guildID = req.query.state.substr("invite".length, req.query.state.length);
            req.client.knownGuilds.push({ id: guildID, user: req.user.id });
            return res.redirect("/dashboard/" + guildID);
        }
    }
    const redirectURL = req.client.dashboardStates[req.query.state] || "/dashboard";

    const tokens = await oauth
        .tokenRequest({
            clientId: req.client.user.id,
            clientSecret: process.env.CLIENT_SECRET,
            code: req.query.code,
            scope: "identify guilds email",
            grantType: "authorization_code",
            redirectUri: `${BASE_URL}/auth/callback`,
        })
        .catch((e) => {
            req.client.logger.error("Failed to get tokens");
            req.client.logger.error(e);
            return res.redirect(`/api/login&state=${req.query.state}`);
        });

    if (!tokens) return;

    const userData = {
        infos: null,
        guilds: null,
    };
    while (!userData.infos || !userData.guilds) {
        /* User infos */
        if (!userData.infos) {
            const user = await oauth.getUser(tokens.access_token);
            userData.infos = user;
        }
        /* User guilds */
        if (!userData.guilds) {
            const guilds = await oauth.getUserGuilds(tokens.access_token);
            userData.guilds = guilds;
        }
    }

    // Update session
    req.session.user = userData;

    // Update DB Login
    const model = await DBModel.get(req.session.user.infos.id);
    model.logged_in = true;
    model.tokens.access_token = encrypt(tokens.access_token);
    model.tokens.refresh_token = encrypt(tokens.refresh_token);
    model.tokens.expires = Date.now() + tokens.expires_in * 1000;
    await model.save();

    req.session.locale = model.locale;

    res.redirect(redirectURL);
});

// Logout
router.get("/logout", async function (req, res) {
    if (!req.user || !req.user.infos) return res.redirect(BASE_URL);
    const userId = req.user.infos.id;
    req.session.destroy(async (err) => {
        if (err) {
            req.client.logger.error("Failed to destroy session: " + err);
            return res.redirect(BASE_URL);
        }

        // Update DB
        const user = await DBModel.get(userId);
        user.logged_in = false;
        await user.save();

        res.redirect(BASE_URL);
    });
});

module.exports = router;
