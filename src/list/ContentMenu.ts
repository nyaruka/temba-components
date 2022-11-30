import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { ContentMenuItem } from '../interfaces';

import { RapidElement } from '../RapidElement';
import { getUrl, WebResponse } from '../utils';

export class ContentMenu extends RapidElement {
  static get styles() {
    return css``;
  }

  @property({ type: String })
  endpoint: string;

  @property({ type: Object })
  headers: any = {};

  @property({ type: Array })
  items: ContentMenuItem[] = [];

  // http promise to monitor for completeness
  public httpComplete: Promise<void | WebResponse>;

  private contentMenu: ContentMenu;

  public getContentMenu(): ContentMenu {
    return this.contentMenu;
  }

  public getHeaders(): any {
    const headers = this.headers;
    headers['X-TEMBA-CONTENT-MENU'] = 1; //todo confirm whether X vs HTTP is needed
    return headers;
  }

  public fetchContentMenu() {
    this.httpComplete = getUrl(this.endpoint, null, this.getHeaders())
      .then((response: WebResponse) => {
        const json = response.json;
        const contentMenu = json as ContentMenu;
        return contentMenu;
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  public refresh() {
    //todo
  }

  // public updated(changes: Map<string, any>) {
  //     //todo
  // }

  //blah1 is public required, blah2 is private required
  //blah3 is optional?, blah4 is event handling?
  public render(): TemplateResult {
    return html`
      <temba-content-menu
        blah1=${'blah1'}
        .blah2=${'blah2'}
        ?blah3=${'blah3'}
        @blah4=${'blah4'}
      >
        ${this.getContentMenuItems()}
      </temba-content-menu>
    `;
  }

  private getContentMenuItems() {
    if (this.items) {
      return html`
        ${this.items.map(
          (item: ContentMenuItem) => html`${this.getContentMenuItem(item)}`
        )}
      `;
    } else {
      return null;
    }
  }

  private getContentMenuItem(item: ContentMenuItem) {
    return html` <temba-content-menu-item> ${item} </temba-content-menu-item> `;
  }
}
