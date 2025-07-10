import { __decorate } from "tslib";
import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { getUrl } from '../utils';
const HEADERS = {
    'X-Temba-Content-Menu': '1',
    'X-Temba-Spa': '1'
};
export var ContentMenuItemType;
(function (ContentMenuItemType) {
    ContentMenuItemType["LINK"] = "link";
    ContentMenuItemType["JS"] = "js";
    ContentMenuItemType["URL_POST"] = "url_post";
    ContentMenuItemType["MODAX"] = "modax";
    ContentMenuItemType["DIVIDER"] = "divider";
})(ContentMenuItemType || (ContentMenuItemType = {}));
export class ContentMenu extends RapidElement {
    constructor() {
        super(...arguments);
        this.buttons = [];
        this.items = [];
    }
    static get styles() {
        return css `
      :host {
        tabindex: 0;
      }
      .container {
        --button-y: 0.4em;
        --button-x: 1em;
        display: flex;
        align-items: center;
      }

      .button_item,
      .primary_button_item {
        margin-left: 1rem;
      }

      temba-button {
        margin-right: 0.5rem;
      }
      .toggle {
        --icon-color: rgb(102, 102, 102);
        padding: 0.4em;
      }

      .toggle:hover {
        background: rgba(0, 0, 0, 0.05);
        border-radius: var(--curvature);
        --icon-color: rgb(136, 136, 136);
      }

      .dropdown {
        padding: 1rem 1.5rem;
        color: rgb(45, 45, 45);
        z-index: 50;
        min-width: 200px;
        tabindex: 0;
      }

      .divider {
        border-bottom: 1px solid rgb(237, 237, 237);
        margin: 1rem -1.5em;
      }

      .item {
        white-space: nowrap;
        margin: 0.2em 0em;
        font-size: 1.1rem;
        cursor: pointer;
        font-weight: 400;
        tabindex: 0;
      }

      .item:hover {
        color: var(--color-link-primary);
      }
    `;
    }
    fetchContentMenu() {
        const url = this.endpoint;
        if (url) {
            const legacy = this.legacy;
            const headers = HEADERS;
            if (legacy) {
                delete headers['Temba-Spa'];
            }
            //ok, fetch the content menu
            getUrl(url, null, headers)
                .then((response) => {
                const json = response.json;
                const contentMenu = json.items;
                //populate (or initialize) the buttons and items
                if (contentMenu) {
                    this.buttons = contentMenu.filter((item) => item.as_button);
                    this.items = contentMenu.filter((item) => !item.as_button);
                }
                else {
                    this.buttons = [];
                    this.items = [];
                }
                //fire custom loaded event type when we're finished
                this.fireCustomEvent(CustomEventType.Loaded, {
                    buttons: this.buttons,
                    items: this.items
                });
            })
                .catch((error) => {
                this.fireCustomEvent(CustomEventType.Loaded, {
                    buttons: this.buttons,
                    items: this.items
                });
                console.error(error);
            });
        }
    }
    refresh() {
        this.fetchContentMenu();
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('endpoint') || changes.has('legacy')) {
            this.fetchContentMenu();
        }
    }
    handleItemClicked(item, event) {
        this.fireCustomEvent(CustomEventType.Selection, { item, event });
    }
    render() {
        return html `
      <div class="container">
        ${this.buttons.map((button) => {
            return html `<temba-button
            class="${button.primary ? 'primary_button_item' : 'button_item'}"
            name=${button.label}
            @click=${(event) => this.handleItemClicked(button, event)}
          >
            ${button.label}
          </temba-button>`;
        })}
        ${this.items && this.items.length > 0
            ? html `<temba-dropdown>
              <div slot="toggle" class="toggle">
                <temba-icon name="menu" size="1.5"></temba-icon>
              </div>
              <div slot="dropdown" class="dropdown">
                ${this.items.map((item) => {
                if (item.type === ContentMenuItemType.DIVIDER) {
                    return html ` <div class="divider"></div>`;
                }
                else {
                    return html ` <div
                      class="item"
                      name=${item.label}
                      @click=${(event) => this.handleItemClicked(item, event)}
                    >
                      ${item.label}
                    </div>`;
                }
            })}
              </div>
            </temba-dropdown>`
            : null}
      </div>
    `;
    }
}
__decorate([
    property({ type: String })
], ContentMenu.prototype, "endpoint", void 0);
__decorate([
    property({ type: Number })
], ContentMenu.prototype, "legacy", void 0);
__decorate([
    property({ type: Array, attribute: false })
], ContentMenu.prototype, "buttons", void 0);
__decorate([
    property({ type: Array, attribute: false })
], ContentMenu.prototype, "items", void 0);
__decorate([
    property({ type: Boolean })
], ContentMenu.prototype, "arrowTopLeft", void 0);
//# sourceMappingURL=ContentMenu.js.map