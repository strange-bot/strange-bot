const Cryptr = require("cryptr");
const config = require("./../config");

function encrypt(data) {
    if (!config.DASHBOARD.ENCRYPT) return data;
    const cryptr = new Cryptr(process.env.DASHBOARD_SECRET);
    return cryptr.encrypt(data);
}

function decrypt(data) {
    if (!config.DASHBOARD.ENCRYPT) return data;
    const cryptr = new Cryptr(process.env.DASHBOARD_SECRET);
    return cryptr.decrypt(data);
}

module.exports = {
    encrypt,
    decrypt,
};
