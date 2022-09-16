import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { FormElement } from '../FormElement';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { TextInput } from '../textinput/TextInput';

export class ContactFieldEditor extends RapidElement {
  @property({ type: String })
  key: string;

  @property({ type: String })
  value: string;

  @property({ type: String })
  name: string;

  @property({ type: String })
  type: string;

  @property({ type: String })
  timezone: string;

  @property({ type: String })
  icon = navigator.clipboard ? 'copy' : '';

  @property({ type: String })
  iconClass = '';

  static get styles() {
    return css`
      .wrapper {
        --widget-box-shadow: none;
      }

      .prefix {
        background: rgba(0, 0, 0, 0.05);
        border-top-left-radius: var(--curvature-widget);
        border-bottom-left-radius: var(--curvature-widget);
        color: #888;
        cursor: pointer;
        width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        padding: 0em 0.5em;
      }

      .wrapper {
        margin-bottom: -1px;
      }

      .prefix .name {
        padding: 0.5em 0em;
        color: #888;
        width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .postfix {
        display: flex;
        align-items: stretch;
      }

      .popper {
        padding: 0.5em 0.75em;
        background: rgba(240, 240, 240, 1);
        border-top-right-radius: var(--curvature-widget);
        border-bottom-right-radius: var(--curvature-widget);
        --icon-color: #888;
        opacity: 0;
        cursor: default;
        transform: scale(0.5);
        transition: all 300ms ease-in-out;
        display: flex;
        align-items: stretch;
        z-index: 1000;
      }

      temba-icon[name='calendar'] {
        --icon-color: rgba(0, 0, 0, 0.2);
      }

      temba-icon:hover {
        --icon-color: rgba(0, 0, 0, 0.5);
      }

      temba-icon {
        cursor: pointer;
        --icon-color: rgba(0, 0, 0, 0.3);
      }

      temba-textinput:hover .popper {
        opacity: 1;
        transform: scale(1);
      }

      temba-textinput:focus .popper {
        opacity: 1;
        transform: scale(1);
      }

      .unset temba-textinput:focus .popper,
      .unset temba-textinput:hover .popper {
        opacity: 0;
      }

      .copy.clicked temba-icon {
        transform: scale(1.2);
      }

      temba-icon {
        transition: all 200ms ease-in-out;
      }

      temba-icon[name='search'] {
        margin-right: 1em;
      }

      temba-datepicker {
        --curvature: 0px;
        position: relative;
      }
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  public handleIconClick(evt: MouseEvent) {
    const ele = evt.target as HTMLDivElement;
    const icon = ele.getAttribute('name');
    const input = this.shadowRoot.querySelector('temba-textinput') as TextInput;

    if (icon === 'copy') {
      if (navigator.clipboard) {
        this.iconClass = 'clicked';
        navigator.clipboard.writeText(input.getDisplayValue()).then(() => {
          window.setTimeout(() => {
            this.iconClass = '';
          }, 300);
        });
      }
    }

    if (icon === 'search') {
      this.fireCustomEvent(CustomEventType.ButtonClicked, {
        key: this.key,
        value: this.value,
      });
    }

    evt.preventDefault();
    evt.stopPropagation();
  }

  public handleSubmit() {
    const input = this.shadowRoot.querySelector(
      'temba-textinput, temba-datepicker'
    ) as FormElement;
    if (input.value !== this.value) {
      this.value = input.value;
      this.fireEvent('change');
    }
    this.icon = navigator.clipboard ? 'copy' : '';
  }

  public handleChange(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  public handleInput(evt: KeyboardEvent) {
    if (evt.key === 'Enter') {
      const input = evt.currentTarget as TextInput;
      input.blur();
    }
  }

  public render(): TemplateResult {
    return html`
      <div class="wrapper ${this.value ? 'set' : 'unset'}">
        ${this.type === 'datetime'
          ? html`
              <temba-datepicker
                timezone=${this.timezone}
                value="${this.value ? this.value : ''}"
                @change=${this.handleSubmit}
                time
              >
                <div class="prefix" slot="prefix">
                  <div class="name">${this.name}</div>
                </div>
              </temba-datepicker>
            `
          : html`
              <temba-textinput
                value="${this.value ? this.value : ''}"
                @blur=${this.handleSubmit}
                @keydown=${this.handleInput}
                @change=${this.handleChange}
              >
                <div class="prefix" slot="prefix">
                  <div class="name">${this.name}</div>
                </div>

                <div class="postfix">
                  <div
                    class="popper ${this.iconClass}"
                    @click=${this.handleIconClick}
                  >
                    ${this.value
                      ? html`
                  <temba-icon
                    name="search"
                    animateclick="pulse"
                  ></temba-icon>
                  </div>
                `
                      : null}
                    <temba-icon
                      name="${this.icon}"
                      animatechange="spin"
                      animateclick="pulse"
                    ></temba-icon>
                  </div>
                </div>
              </temba-textinput>
            `}
      </div>
    `;
  }
}
