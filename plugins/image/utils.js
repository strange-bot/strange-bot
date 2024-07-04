async function getImageFromMessage(message, args) {
    let url;

    // check for attachments
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        const attachUrl = attachment.url;
        const attachIsImage =
            attachUrl.endsWith(".png") || attachUrl.endsWith(".jpg") || attachUrl.endsWith(".jpeg");
        if (attachIsImage) url = attachUrl;
    }

    if (!url && args.length === 0)
        url = message.author.displayAvatarURL({ size: 256, extension: "png" });

    if (!url && args.length !== 0) {
        try {
            url = new URL(args[0]).href;
        } catch (ex) {
            /* Ignore */
        }
    }

    if (!url && message.mentions.users.size > 0) {
        url = message.mentions.users.first().displayAvatarURL({ size: 256, extension: "png" });
    }

    if (!url) {
        const member = await message.guild.resolveMember(args[0]);
        if (member) url = member.user.displayAvatarURL({ size: 256, extension: "png" });
    }

    if (!url) url = message.author.displayAvatarURL({ size: 256, extension: "png" });

    return url;
}

module.exports = {
    getImageFromMessage,
};
