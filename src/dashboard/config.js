const fs = require("node:fs");
const path = require("node:path");
const Model = require("../schemas/Config");

let cachedModel = null;

async function init() {
    let model = await Model.findById("dashboard");
    // Write the content to the respective files
    if (model) {
        fs.writeFileSync(path.join(__dirname, "views/landing.html"), model.config.html);
        fs.writeFileSync(path.join(__dirname, "public/css/landing.css"), model.config.css);
        fs.writeFileSync(path.join(__dirname, "public/js/landing.js"), model.config.js);
    }

    // Save to model
    else {
        const html = fs.readFileSync(path.join(__dirname, "views/landing.html"), "utf8");
        const js = fs.readFileSync(path.join(__dirname, "public/js/landing.js"), "utf8");
        const css = fs.readFileSync(path.join(__dirname, "public/css/landing.css"), "utf8");

        model = new Model({
            _id: "dashboard",
            config: {
                html,
                css,
                js,
            },
        });
    }

    cachedModel = model;
}

function get() {
    if (!cachedModel) {
        throw new Error("Config model not initialized");
    }

    return cachedModel;
}

module.exports = {
    init,
    get,
};
