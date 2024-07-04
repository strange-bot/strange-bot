const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { EmbedUtils, Logger } = require("strange-sdk/utils");

let coreConfig = null;
try {
    coreConfig = require("../../../core/config");
} catch (ex) {
    Logger.warn("Missing core config?");
}

module.exports = ({ client, guild }) => {
    const embed = EmbedUtils.embed()
        .setAuthor({ name: guild.getT("information:BOT.INVITE_EMBED_TITLE") })
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(guild.getT("information:BOT.INVITE_EMBED_DESC"));

    // Buttons
    let components = [];
    components.push(
        new ButtonBuilder()
            .setLabel(guild.getT("information:BOT.INVITE_BTN_LABEL"))
            .setURL(client.getInvite())
            .setStyle(ButtonStyle.Link),
    );

    if (coreConfig.get("SUPPORT_SERVER")) {
        components.push(
            new ButtonBuilder()
                .setLabel(guild.getT("information:BOT.INVITE_BTN_SUPPORT"))
                .setURL(coreConfig.get("SUPPORT_SERVER"))
                .setStyle(ButtonStyle.Link),
        );
    }

    let buttonsRow = new ActionRowBuilder().addComponents(components);
    return { embeds: [embed], components: [buttonsRow] };
};
