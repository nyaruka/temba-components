import { TemplateResult, html, css } from 'lit';
import { property, customElement } from 'lit/decorators';

import { FormElement } from '../FormElement';
import 'lit-flatpickr';

@customElement('temba-datepicker')
export default class DatePicker extends FormElement {
  static get styles() {
    return css`
      .textinput {
        padding: 9px;
        border: none;
        flex: 1;
        margin: 0;
        background: none;
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: 13px;
        cursor: text;
        resize: none;
        font-weight: 300;
        width: 100%;
      }

      .datepicker {
        padding: 9px;
        margin: 0px;
        border: 1px red solid;
      }

      .textinput:focus {
        outline: none;
        box-shadow: none;
        cursor: text;
      }

      .textinput::placeholder {
        color: var(--color-placeholder);
        font-weight: 300;
      }
    `;
  }

  @property({ type: String })
  placeholder = '';

  @property({ type: String })
  value = '';

  @property({ type: String })
  name = '';

  @property({ type: Object })
  inputElement: HTMLInputElement;

  /** we just return the value since it should be a string */
  public serializeValue(value: any): string {
    return value;
  }

  public render(): TemplateResult {
    return html`
      <lit-flatpickr
        class="textinput"
        id="my-date-picker"
        altInput
        altFormat="F j, Y"
        dateFormat="Y-m-d H:i"
        enableTime: true
      >
        <input class="textinput"></input>
      </lit-flatpickr>
    `;
  }
}
