const Cryptr = require("cryptr");

function encrypt(data) {
    const cryptr = new Cryptr(process.env.TOKEN_ENCRYPTION_KEY);
    return cryptr.encrypt(data);
}

function decrypt(data) {
    const cryptr = new Cryptr(process.env.TOKEN_ENCRYPTION_KEY);
    return cryptr.decrypt(data);
}

module.exports = {
    encrypt,
    decrypt,
};
