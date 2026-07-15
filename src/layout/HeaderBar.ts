import { css, html, TemplateResult } from 'lit';
import { RapidElement } from '../RapidElement';
import { designTokens } from '../styles/designTokens';

/**
 * A fixed-height header strip with a full-bleed rule under it, for the
 * chat + cards pages (contact read, tickets). Pages can use several side
 * by side (e.g. one over a list column, one over the chat) — the shared
 * height and surface make them read as one continuous control.
 */
export class HeaderBar extends RapidElement {
  static get styles() {
    return css`
      ${designTokens}

      :host {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        /* 52px strip plus the 1px rule */
        height: 53px;
        box-sizing: border-box;
        padding: 0 8px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
      }

      ::slotted(*) {
        flex-grow: 1;
        min-width: 0;
      }
    `;
  }

  public render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
