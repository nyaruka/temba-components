import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { CustomEventType } from '../interfaces';

import { RapidElement } from '../RapidElement';
import { getUrl, WebResponse } from '../utils';

const HEADERS = {
  'Temba-Content-Menu': '1',
  'Temba-Spa': '1',
};

export interface ContentMenuItem {
  type: string;
  as_button: boolean;
  label: string;
  url: string;
  disabled: boolean;
  modal_id: string;
  on_submit: string;
  primary: boolean;
  title: string;
  on_click: null;
  link_class: string;
}

export enum ContentMenuItemType {
  LINK = 'link',
  JS = 'js',
  URL_POST = 'url_post',
  MODAX = 'modax',
  DIVIDER = 'divider',
}

export class ContentMenu extends RapidElement {
  static get styles() {
    return css`
      .container {
        --button-y: 0.4em;
        --button-x: 1em;
        display: flex;
      }

      .button_item,
      .primary_button_item {
        margin-left: 1rem;
      }

      .toggle {
        --icon-color: rgb(102, 102, 102);
        padding: 0.5rem;
        margin-left: 0.5rem;
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
      }

      .item:hover {
        color: rgb(var(--primary-rgb));
      }
    `;
  }

  @property({ type: String })
  endpoint: string;

  @property({ type: Array })
  buttons: ContentMenuItem[] = [];

  @property({ type: Array })
  items: ContentMenuItem[] = [];

  private fetchContentMenu() {
    getUrl(this.endpoint, null, HEADERS)
      .then((response: WebResponse) => {
        const json = response.json;
        console.log('items', json.items);
        const contentMenu = json.items as ContentMenuItem[];
        this.buttons = contentMenu.filter(item => item.as_button);
        this.items = contentMenu.filter(item => !item.as_button);
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  public refresh() {
    this.fetchContentMenu();
  }

  protected updated(changes: Map<string, any>) {
    if (changes.has('endpoint')) {
      this.fetchContentMenu();
    }
  }

  private handleItemClicked(item: ContentMenuItem) {
    this.fireCustomEvent(CustomEventType.Selection, item);
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        ${this.buttons.map(button => {
          return html`<temba-button
            class="${button.primary ? 'primary_button_item' : 'button_item'}"
            name=${button.label}
            @click=${() => this.handleItemClicked(button)}
          >
            ${button.label}
          </temba-button>`;
        })}
        ${this.items && this.items.length > 0
          ? html` <temba-dropdown
              arrowsize="8"
              arrowoffset="-12"
              offsetx="24"
              offsety="6"
            >
              <div slot="toggle" class="toggle">
                <temba-icon name="menu" size="1.5" />
              </div>
              <div slot="dropdown" class="dropdown">
                ${this.items.map(item => {
                  if (item.type === ContentMenuItemType.DIVIDER) {
                    return html` <div class="divider"></div>`;
                  } else {
                    return html` <div
                      class="item"
                      name=${item.label}
                      @click=${() => this.handleItemClicked(item)}
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