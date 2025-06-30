import { User } from '../../../shared/interfaces';

export const SVG_FINGERPRINT = 'febafb41c2fd60efa2bdaead993c7087';

// webchat spritesheet
export enum WebChatIcon {
  send = 'send-03',
  attachment = 'paperclip',
  attachment_audio = 'volume-min',
  attachment_document = 'file-06',
  attachment_image = 'image-01',
  attachment_location = 'marker-pin-01',
  attachment_video = 'video-recorder'
}

export const getUserDisplay = (user: User) => {
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
