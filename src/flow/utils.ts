import { html } from 'lit-html';
import { NamedObject } from '../store/flow-definition';

/**
 * Renders a single line item with optional icon
 */
export const renderLineItem = (name: string, icon?: string) => {
  return html`<div style="display:flex;items-align:center;">
    ${icon
      ? html`<temba-icon name=${icon} style="margin-right:0.5em"></temba-icon>`
      : null}
    <div
      style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;"
    >
      ${name}
    </div>
  </div>`;
};

/**
 * Renders a list of named objects with optional icon, showing up to 3 items
 * with a "+X more" indicator if there are more items
 */
export const renderNamedObjects = (assets: NamedObject[], icon?: string) => {
  return renderStringList(
    assets.map((asset) => asset.name),
    icon
  );
};

/**
 * Renders a list of strings with optional icon, showing up to 3 items
 * with a "+X more" indicator if there are more items
 */
export const renderStringList = (items: string[], icon?: string) => {
  const itemElements = [];
  const maxDisplay = 3;

  // Show up to 3 items, or all 4 if exactly 4 items
  const displayCount =
    items.length === 4 ? 4 : Math.min(maxDisplay, items.length);

  for (let i = 0; i < displayCount; i++) {
    const item = items[i];
    itemElements.push(renderLineItem(item, icon));
  }

  // Add "+X more" if there are more than 3 items (and not exactly 4)
  if (items.length > maxDisplay && items.length !== 4) {
    const remainingCount = items.length - maxDisplay;
    itemElements.push(html`<div
      style="display:flex;items-align:center;margin-top:0.2em;"
    >
      ${icon
        ? html`<div style="margin-right:0.4em; width: 1em;"></div>` // spacing placeholder
        : null}
      <div style="font-size:0.8em">+${remainingCount} more</div>
    </div>`);
  }
  return itemElements;
};

export interface Scheme {
  scheme: string;
  name: string;
  path: string;
  excludeFromSplit?: boolean;
}

export const SCHEMES: Scheme[] = [
  {
    scheme: 'tel',
    name: 'SMS',
    path: 'Phone Number'
  },
  {
    scheme: 'whatsapp',
    name: 'WhatsApp',
    path: 'WhatsApp Number'
  },
  {
    scheme: 'facebook',
    name: 'Facebook',
    path: 'Facebook ID'
  },
  {
    scheme: 'instagram',
    name: 'Instagram',
    path: 'Instagram ID'
  },
  {
    scheme: 'twitterid',
    name: 'Twitter',
    path: 'Twitter ID',
    excludeFromSplit: true
  },
  {
    scheme: 'telegram',
    name: 'Telegram',
    path: 'Telegram ID'
  },
  {
    scheme: 'viber',
    name: 'Viber',
    path: 'Viber ID'
  },
  {
    scheme: 'line',
    name: 'Line',
    path: 'Line ID'
  },
  {
    scheme: 'wechat',
    name: 'WeChat',
    path: 'WeChat ID'
  },
  {
    scheme: 'fcm',
    name: 'Firebase',
    path: 'Firebase ID'
  },
  {
    scheme: 'jiochat',
    name: 'JioChat',
    path: 'JioChat ID'
  },
  {
    scheme: 'freshchat',
    name: 'Freshchat',
    path: 'Freshchat ID'
  },
  {
    scheme: 'mailto',
    name: 'Email',
    path: 'Email Address',
    excludeFromSplit: true
  },
  {
    scheme: 'twitter',
    name: 'Twitter',
    path: 'Twitter Handle',
    excludeFromSplit: true
  },
  {
    scheme: 'vk',
    name: 'VK',
    path: 'VK ID'
  },
  {
    scheme: 'discord',
    name: 'Discord',
    path: 'Discord ID'
  },
  {
    scheme: 'webchat',
    name: 'Webchat',
    path: 'Webchat ID',
    excludeFromSplit: true
  },
  {
    scheme: 'rocketchat',
    name: 'RocketChat',
    path: 'RocketChat ID'
  },
  {
    scheme: 'ext',
    name: 'External',
    path: 'External ID'
  }
];
