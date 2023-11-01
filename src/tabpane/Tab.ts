import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';

export class Tab extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        flex-grow: 1;  
        min-height: 0;
      }      
      
      slot {
        // display: none;
      

      slot.selected {
        // display: flex;
        // flex-direction: column;
        // flex-grow: 1;
      }
    `;
  }

  @property({ type: String })
  name: string;

  @property({ type: String })
  icon: string;

  @property({ type: String })
  selectionColor: string;

  @property({ type: String })
  selectionBackground: string;

  @property({ type: Boolean })
  selected = false;

  @property({ type: Boolean })
  notify = false;

  @property({ type: Boolean })
  hidden = false;

  @property({ type: Number })
  count = 0;

  @property({ type: Boolean })
  checked = false;

  public hasBadge() {
    return this.count > 0;
  }

  public render(): TemplateResult {
    return html`<slot
      class="${getClasses({ selected: this.selected })}"
    ></slot> `;
  }
}
