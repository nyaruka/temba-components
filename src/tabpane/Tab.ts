import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
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

  @property({ type: Boolean })
  selected = false;

  public render(): TemplateResult {
    return html`<slot
      class="${getClasses({ selected: this.selected })}"
    ></slot>`;
  }
}
