import { User } from '../interfaces';

export const SVG_FINGERPRINT = 'febafb41c2fd60efa2bdaead993c7087';

// webchat spritesheet
export enum WebChatIcon {
  send = 'send-03'
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
