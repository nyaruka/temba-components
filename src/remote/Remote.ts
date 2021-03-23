import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from 'lit-element';
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

    // our endpoint changed fetch the latest
    if (changes.has('endpoint')) {
    }
  }

  public render(): TemplateResult {
    return html``;
  }
}
