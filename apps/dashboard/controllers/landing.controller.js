/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.get = async function (_req, res) {
    res.render("index", {
        layout: "layouts/landing",
        title: "Strange Bot - The Open Source, Extensible Discord Bot Platform",
    });
};
