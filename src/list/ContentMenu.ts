import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { ContentMenuItem, CustomEventType } from '../interfaces';

import { RapidElement } from '../RapidElement';
import { getUrl, WebResponse } from '../utils';

const HEADERS = {
  'Temba-Content-Menu': '1',
  'Temba-Spa': '1',
};
const MODAX_HEADERS = {
  'Temba-Spa': '1',
};

export class ContentMenu extends RapidElement {
  static get styles() {
    return css`
      .container {
        --button-y: 0.4em;
        --button-x: 1em;
        display: flex;
        height: 100%;
      }

      .primary_button_item {
        margin-left: 1rem;
      }

      .button_item {
        margin-left: 1rem;
      }

      temba-dropdown {
        align-items: stretch;
        display: flex;
        flex-direction: column;
      }

      .toggle {
        color: #666;
        align-items: center;
        display: flex;
        flex-direction: column;
        padding: 0.5rem;
        margin-left: 0.5rem;
        border-radius: var(--curvature);
      }

      .toggle:hover {
        background: yellow;
        color: purple;
      }

      div[slot='dropdown'] {
        padding: 1rem 1.5rem;
        color: rgb(45, 45, 45);
        z-index: 50;
        min-width: 200px;
      }

      .item {
        white-space: nowrap;
        margin: 0.2em 0em;
        font-size: 1.1rem;
        cursor: pointer;
        color: inherit;
        font-weight: 400;
      }

      .divider {
        border-bottom: 1px solid #ccc;
        margin: 1rem -1.5em;
      }
    `;
  }

  @property({ type: String })
  endpoint: string;

  // @property({ type: ContentMenuItem})
  // primaryButton: ContentMenuItem;

  @property({ type: Array })
  buttons: ContentMenuItem[] = [];

  @property({ type: Array })
  items: ContentMenuItem[] = [];

  private contentMenu: ContentMenu;

  public getContentMenu(): ContentMenu {
    return this.contentMenu;
  }

  private fetchContentMenu() {
    getUrl(this.endpoint, null, HEADERS)
      .then((response: WebResponse) => {
        const json = response.json;
        const contentMenu = json.items as ContentMenuItem[];
        // this.primaryButton = contentMenu.filter(item => item.as_button && item.primary); //todo do we need this?
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

  //todo div container class needs to transcribe -> .flex.h-full.spa-gear-buttons
  //todo temba-button class needs to transcribe -> .ml-4
  //todo temba-dropdown class needs to transcribe -> .items-stretch.flex.flex-column(arrowoffset="-12" offsetx="24" offsety="6" arrowsize="8")
  //todo div slot="toggle" class needs to transcribe -> .menu-button.items-center.flex.flex-column.py-2.px-2.ml-2
  //todo div slot="dropdown" class needs to transcribe -> .px-6.py-4.text-gray-800.z-50 and style="min-width:200px"
  //todo div dropdown divider item class needs to transcribe -> .border-b.border-gray-200.my-4.-mx-6
  //todo div dropdown regular item class needs to transcribe -> .whitespace-nowrap.menu-item.hover-linked.font-normal
  //todo what is gear-flag and item.flag? spa_page_menu.aml line 157
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
        <temba-dropdown
          arrowsize="8"
          arrowoffset="-12"
          offsetx="24"
          offsety="6"
          class="TODO"
        >
          <div class="toggle" slot="toggle">
            <temba-icon name="menu" size="1.5" />
          </div>
          <div slot="dropdown">
            ${this.items.map(item => {
              if (item.type === 'divider') {
                return html` <div class="divider"></div>`;
              } else if (item.type === 'modax') {
                return html` <div
                  class="item"
                  name=${item.label}
                  @click=${() => this.handleItemClicked(item)}
                >
                  ${item.label}
                </div>`;
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
        </temba-dropdown>
      </div>
    `;
  }
}
