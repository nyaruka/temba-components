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
        padding: 0.5em 0.75em;
        background: rgba(0, 0, 0, 0.05);
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
        color: #888;
        cursor: pointer;
        width: 80px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .postfix {
        padding: 0.5em 0.75em;
        background: rgba(0, 0, 0, 0.05);
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
        --icon-color: #888;
        opacity: 0;
        cursor: default;
        transform: scale(0.5);
        transition: all 300ms ease-in-out;
        display: flex;
        align-items: stretch;
      }

      .postfix.check {
        background: rgba(90, 145, 86, 0.15);
      }

      .postfix.none {
        opacity: 0;
      }

      .postfix.copy temba-icon:hover {
        --icon-color: #555;
      }

      .postfix.corner-down-left {
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

      temba-textinput:hover .postfix.copy {
        opacity: 1;
        transform: scale(1);
      }

      temba-textinput:focus .postfix.copy {
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

    if (icon === 'copy') {
      if (navigator.clipboard) {
        this.iconClass = 'clicked';
        navigator.clipboard.writeText(this.value).then(() => {
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
          <div class="prefix" slot="prefix">${this.name}</div>
          <div
            class="postfix ${this.iconClass} ${this.icon ? this.icon : 'none'}"
            @click=${this.handleIconClick}
          >
            <temba-icon name="${this.icon}" animatechange="spin"></temba-icon>
          </div>
        </temba-textinput>
      </div>
    `;
  }
}
