import { css, html, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators';
import { RapidElement } from '../RapidElement';

@customElement('temba-remote')
export default class Remote extends RapidElement {
  @property({ type: String })
  endpoint: string;

  static get styles() {
    return css``;
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);
  }

  public render(): TemplateResult {
    return html``;
  }
}
