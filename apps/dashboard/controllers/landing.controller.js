/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.get = async function (_req, res) {
    res.render("index", {
        layout: "layouts/landing",
        title: "Nexcord - The Ultimate Discord Bot Platform",
        stats: {
            servers: "1,00+",
            users: "4,000+",
            plugins: "20+",
        },
    });
};
