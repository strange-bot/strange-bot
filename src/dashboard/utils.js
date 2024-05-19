const Cryptr = require("cryptr");
const config = require("../../plugins/core/config");

function encrypt(data) {
    if (!config.get("DASHBOARD").ENCRYPT) return data;
    const cryptr = new Cryptr(process.env.DASHBOARD_SECRET);
    return cryptr.encrypt(data);
}

function decrypt(data) {
    if (!config.get("DASHBOARD").ENCRYPT) return data;
    const cryptr = new Cryptr(process.env.DASHBOARD_SECRET);
    return cryptr.decrypt(data);
}

module.exports = {
    encrypt,
    decrypt,
};
