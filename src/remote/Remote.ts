import { css, html, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getUrl } from '../utils';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

@customElement('temba-remote')
export default class Remote extends RapidElement {
  @property({ type: String })
  endpoint: string;

  @property({ attribute: false })
  body: any = html`<temba-loading></temba-loading>`;

  static get styles() {
    return css``;
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    if (changes.has('endpoint')) {
      getUrl(this.endpoint).then((response) => {
        this.body = unsafeHTML(response.body);
      });
    }
  }

  public render(): TemplateResult {
    return html`${this.body}`;
  }
}
