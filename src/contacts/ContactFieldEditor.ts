import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
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
  icon = navigator.clipboard ? 'copy' : '';

  @property({ type: String })
  iconClass = '';

  static get styles() {
    return css`
      .prefix {
        background: rgba(0, 0, 0, 0.05);
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
        color: #888;
        cursor: pointer;
        width: 100px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        padding: 0em 0.5em;
      }

      .prefix .name {
        padding: 0.5em 0em;
        color: #888;
        width: 80px;
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
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
        --icon-color: #888;
        opacity: 0;
        cursor: default;
        transform: scale(0.5);
        transition: all 300ms ease-in-out;
        display: flex;
        align-items: stretch;
        z-index: 1000;
      }

      .postfix temba-icon[name='calendar'] {
        --icon-color: #e3e3e3;
      }

      .popper.check {
        background: rgba(90, 145, 86, 0.15);
      }

      .popper.none {
        opacity: 0;
      }

      .popper.copy temba-icon:hover {
        --icon-color: #555;
      }

      .popper.corner-down-left {
        // background: var(--color-primary-dark);
        // --icon-color: var(--color-text-light);
        opacity: 1;
        transform: scale(1);
      }

      temba-icon {
        cursor: pointer;
      }

      temba-icon[name='check'] {
        --icon-color: rgb(90, 145, 86);
      }

      temba-textinput:hover .popper.copy {
        opacity: 1;
        transform: scale(1);
      }

      temba-textinput:focus .popper.copy {
        opacity: 1;
        transform: scale(1);
      }

      .copy.clicked temba-icon {
        transform: scale(1.2);
      }

      temba-icon {
        transition: all 200ms ease-in-out;
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
    evt.preventDefault();
    evt.stopPropagation();
  }

  public handleSubmit() {
    const input = this.shadowRoot.querySelector('temba-textinput') as TextInput;
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
      <div>
        <temba-textinput
          value="${this.value ? this.value : ''}"
          ?datetimepicker=${this.type === 'datetime'}
          @blur=${this.handleSubmit}
          @keydown=${this.handleInput}
          @change=${this.handleChange}
        >
          <div class="prefix" slot="prefix">
            <div class="name">${this.name}</div>
          </div>

          <div class="postfix">
            ${this.type === 'datetime'
              ? html`<div
                  style="position: absolute; padding-top: .75em; padding-left: .75em;"
                >
                  <temba-icon name="calendar" />
                </div>`
              : null}

            <div
              class="popper ${this.iconClass} ${this.icon ? this.icon : 'none'}"
              @click=${this.handleIconClick}
            >
              <temba-icon name="${this.icon}" animatechange="spin"></temba-icon>
            </div>
          </div>
        </temba-textinput>
      </div>
    `;
  }
}
