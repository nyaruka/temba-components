import { html } from 'lit-html';
import { NamedObject } from '../store/flow-definition';

/**
 * Renders a single line item with optional icon
 */
export const renderLineItem = (name: string, icon?: string) => {
  return html`<div style="display:flex;items-align:center">
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
  const items = [];
  const maxDisplay = 3;

  // Show up to 3 items, or all 4 if exactly 4 items
  const displayCount =
    assets.length === 4 ? 4 : Math.min(maxDisplay, assets.length);

  for (let i = 0; i < displayCount; i++) {
    const asset = assets[i];
    items.push(renderLineItem(asset.name, icon));
  }

  // Add "+X more" if there are more than 3 items (and not exactly 4)
  if (assets.length > maxDisplay && assets.length !== 4) {
    const remainingCount = assets.length - maxDisplay;
    items.push(html`<div style="display:flex;items-align:center; color: #666;">
      ${icon
        ? html`<div style="margin-right:0.5em; width: 1em;"></div>` // spacing placeholder
        : null}
      <div>+${remainingCount} more</div>
    </div>`);
  }

  return items;
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
      style="display:flex;items-align:center; color: #666;"
    >
      ${icon
        ? html`<div style="margin-right:0.5em; width: 1em;"></div>` // spacing placeholder
        : null}
      <div>+${remainingCount} more</div>
    </div>`);
  }

  return itemElements;
};

// URN scheme mapping for user-friendly display
export const urnSchemeMap: Record<string, string> = {
  tel: 'Phone Number',
  email: 'Email',
  twitter: 'Twitter',
  facebook: 'Facebook',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  line: 'Line',
  discord: 'Discord',
  slack: 'Slack',
  external: 'External ID'
};
