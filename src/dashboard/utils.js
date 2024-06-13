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

function flattenObject(ob, prefix = "") {
    let result = {};
    for (const key in ob) {
        if (Object.prototype.hasOwnProperty.call(ob, key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof ob[key] === "object" && ob[key] !== null && !Array.isArray(ob[key])) {
                Object.assign(result, flattenObject(ob[key], newKey));
            } else {
                result[newKey] = ob[key];
            }
        }
    }

    return result;
}

module.exports = {
    encrypt,
    decrypt,
    flattenObject,
};
