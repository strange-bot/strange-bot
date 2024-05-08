const { ChatInputCommandInteraction, ButtonInteraction } = require("discord.js");

ChatInputCommandInteraction.prototype.followUpT = function (key, args) {
    const content = this.guild.getT(key, args);
    return this.followUp(content);
};

ButtonInteraction.prototype.followUpT = function (key, args) {
    const content = this.guild.getT(key, args);
    return this.followUp(content);
};
