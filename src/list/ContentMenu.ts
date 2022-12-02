import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { Modax } from '../dialog/Modax';
import { ContentMenuItem, CustomEventType } from '../interfaces';

import { RapidElement } from '../RapidElement';
import { getUrl, postUrl, WebResponse } from '../utils';

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
        display: flex;
      }

      .button_item {
        //todo
      }

      .item {
        //todo
      }

      .divider {
        //todo
      }
    `;
  }

  @property({ type: String })
  endpoint: string;

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
        console.log('json', json);
        console.log('json.items', json.items);
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
      console.log('changed', this.endpoint);
      this.fetchContentMenu();
    }
  }

  private handleItemClick(item: ContentMenuItem) {
    console.log('clicked', item);

    if (item.type === 'link') {
      console.log('url', item.url);
      window.location.href = item.url;
    }

    if (item.type == 'modax') {
      const modax = this.shadowRoot.querySelector('temba-modax') as Modax;
      modax.endpoint = item.url;
      modax.header = item.label;
      modax.headers = MODAX_HEADERS;
      modax.id = item.modal_id;
      //modax.primaryName = item.primary; //todo confirm if this is needed and what it should be set to?
      modax.disabled = item.disabled; //todo confirm if this is needed and whether it should be set?
      modax.open = true;
    }
    if (item.type === 'url_post') {
      // todo confirm this is right
      const payload: any = '';
      const headers: any = {};
      const contentType = null;
      postUrl(item.url, payload, headers, contentType)
        .then((response: WebResponse) => {
          console.log('response', response);
        })
        .catch((error: any) => {
          console.error('error', error);
        });
    }
    //note: the "js" item type is only used on the archived contacts page for the "delete all" content menu item
    if (item.type == 'js') {
      // todo confirm this is right
      this.fireCustomEvent(CustomEventType.TriggerScript, {
        name: item.on_click,
      });
    }
  }

  private handleModaxOnSubmit(item: ContentMenuItem) {
    // todo confirm this is right
    this.fireCustomEvent(CustomEventType.TriggerScript, {
      name: item.on_submit,
    });
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        ${this.buttons.map(button => {
          return html` <temba-button
            class="button_item"
            name=${button.label}
            @click=${() => this.handleItemClick(button)}
          >
          </temba-button>`;
        })}

        <temba-dropdown>
          <div slot="toggle">
            <temba-icon name="menu" />
          </div>
          <div slot="dropdown">
            ${this.items.map(item => {
              if (item.type === 'divider') {
                return html` <div class="divider"></div>`;
              } else if (item.type === 'modax') {
                return html` <div
                    class="item"
                    name=${item.label}
                    @click=${() => this.handleItemClick(item)}
                  >
                    ${item.label}
                  </div>
                  <temba-modax
                    @temba-submitted="${this.handleModaxOnSubmit(item)}"
                  ></temba-modax>`;
              } else {
                return html` <div
                  class="item"
                  name=${item.label}
                  @click=${() => this.handleItemClick(item)}
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
