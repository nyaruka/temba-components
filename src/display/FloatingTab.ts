import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';

export class FloatingTab extends RapidElement {
  static get styles() {
    return css`
      :host {
        position: fixed;
        right: 0;
        z-index: 9999;
        transition: transform 300ms ease-in-out;
      }

      :host(.hidden) {
        transform: translateX(100%);
      }

      .tab {
        display: flex;
        align-items: center;
        padding: 12px;
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
        cursor: pointer;
        box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 200ms ease-in-out;
        user-select: none;
      }

      .tab:hover {
        padding-right: 16px;
        box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.3);
      }

      .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
      }

      temba-icon {
        --icon-color: white;
      }

      .label {
        color: white;
        font-weight: 500;
        font-size: 14px;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        margin-left: 0;
        opacity: 0;
        transition: all 200ms ease-in-out;
      }

      .tab:hover .label {
        max-width: 200px;
        margin-left: 12px;
        opacity: 1;
      }
    `;
  }

  @property({ type: String })
  icon: string;

  @property({ type: String })
  label: string;

  @property({ type: String })
  color = '#6B7280';

  @property({ type: Number })
  top = 100;

  @property({ type: Boolean })
  hidden = false;

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('hidden')) {
      this.classList.toggle('hidden', this.hidden);
    }
  }

  private handleClick() {
    this.fireCustomEvent(CustomEventType.ButtonClicked, {
      action: 'toggle'
    });
  }

  public render(): TemplateResult {
    const tabStyle = `
      background-color: ${this.color};
      top: ${this.top}px;
    `;

    return html`
      <div class="tab" style="${tabStyle}" @click=${this.handleClick}>
        <div class="icon-container">
          ${this.icon
            ? html`<temba-icon name="${this.icon}"></temba-icon>`
            : ''}
        </div>
        <div class="label">${this.label}</div>
      </div>
    `;
  }
}
