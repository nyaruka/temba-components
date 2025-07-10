export const SVG_FINGERPRINT = 'febafb41c2fd60efa2bdaead993c7087';
// webchat spritesheet
export var WebChatIcon;
(function (WebChatIcon) {
    WebChatIcon["send"] = "send-03";
    WebChatIcon["attachment"] = "paperclip";
    WebChatIcon["attachment_audio"] = "volume-min";
    WebChatIcon["attachment_document"] = "file-06";
    WebChatIcon["attachment_image"] = "image-01";
    WebChatIcon["attachment_location"] = "marker-pin-01";
    WebChatIcon["attachment_video"] = "video-recorder";
})(WebChatIcon || (WebChatIcon = {}));
export const getUserDisplay = (user) => {
    if (user) {
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user.first_name) {
            return user.first_name;
        }
        return user.email;
    }
};
//# sourceMappingURL=index.js.map