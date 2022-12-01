import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { ContentMenuItem } from '../interfaces';

import { RapidElement } from '../RapidElement';
import { getUrl, WebResponse } from '../utils';

const HEADERS = {
  'Temba-Content-Menu': '1',
  'Temba-Spa': '1',
};

export class ContentMenu extends RapidElement {
  static get styles() {
    return css`
      .container {
        display: flex;
      }

      .option {
        padding: 0.5em 1em;
      }

      .divider {
      }
    `;
  }

  @property({ type: String })
  endpoint: string;

  @property({ type: Array })
  items: ContentMenuItem[] = [];

  @property({ type: Array })
  buttons: ContentMenuItem[] = [];

  // http promise to monitor for completeness
  public httpComplete: Promise<void | WebResponse>;

  private contentMenu: ContentMenu;

  public getContentMenu(): ContentMenu {
    return this.contentMenu;
  }

  private fetchContentMenu() {
    getUrl(this.endpoint, null, HEADERS)
      .then((response: WebResponse) => {
        const json = response.json;
        const contentMenu = json.items as ContentMenuItem[];
        this.items = contentMenu.filter(item => !item.button);
        this.buttons = contentMenu.filter(item => item.button);
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
      console.log('changed', this.endpoint);
      this.fetchContentMenu();
    }
  }

  private handleItemClick(item: ContentMenuItem) {
    console.log('clicked', item);

    /*
      if (item.type == "js") {
        this.fireCustomEvent(CustomEventType.TriggerScript, { name: item.js });
      }
    */

    /* 
      if (item.type == "modax") {
        const modax = this.shadowRoot.querySelector("temba-modax") as Modax;
        modax.endpoint = item.endpoint..;
        modax.header = "Header";
        modax.open = true;
      }
    */
  }

  public render(): TemplateResult {
    return html`
      <temba-modax></temba-modax>

      <div class="container">
        ${this.buttons.map(item => {
          return html`<temba-button name=${item.label}></temba-button>`;
        })}

        <temba-dropdown>
          <div slot="toggle">
            <temba-icon name="menu" />
          </div>

          <div slot="dropdown">
            ${this.items.map(item => {
              return html`<div
                class="option"
                @click=${() => this.handleItemClick(item)}
              >
                ${item.label}
              </div>`;
            })}
          </div>
        </temba-dropdown>
      </div>
    `;
  }
}
