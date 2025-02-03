const { Message } = require("discord.js");

Message.prototype.replyT = function (key, args) {
    const content = this.guild.getT(key, args);
    return this.reply(content);
};
