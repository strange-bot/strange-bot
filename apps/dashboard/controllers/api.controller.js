const languages = require("strange-i18n/languages-meta.json");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getBotLocales = async function (req, res) {
    const ipcResp = await req.app.ipcServer.broadcastOne("dashboard:GET_LOCALE_BUNDLE");
    if (!ipcResp?.success) return res.sendStatus(500);

    return res.json(ipcResp.data);
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.updateBotLocales = async function (req, res) {
    const { plugin, language, keys } = req.body;

    // TODO: Add validations

    const response = await req.app.ipcServer.broadcast("dashboard:SET_LOCALE_BUNDLE", {
        plugin,
        language,
        keys,
    });

    if (response.some((r) => !r.success)) return res.sendStatus(500);
    return res.sendStatus(200);
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.updateDashboardLanguage = async function (req, res) {
    const lang = req.body.language_code;

    // check if language is valid
    if (!languages.find((l) => l.name === lang)) {
        return res.sendStatus(400);
    }

    if (!req.session.locale === lang) {
        return res.sendStatus(200);
    }

    await req.app.db
        .getModel("dashboard")
        .updateOne({ _id: req.session.user.info.id }, { $set: { locale: lang } }, { upsert: true });

    req.session.locale = lang;
    req.session.save(async (err) => {
        if (err) {
            req.client.logger.error("Failed to save session: " + err);
            return res.sendStatus(500);
        }

        res.sendStatus(200);
    });
};
