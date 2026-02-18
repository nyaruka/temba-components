import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { getClasses } from '../utils';

export class FloatingTab extends RapidElement {
  static get styles() {
    return css`
      .tab.hidden {
        transform: translateX(100%);
      }
      .tab {
        position: fixed;
        right: 0;
        z-index: 4998;
        display: flex;
        align-items: center;
        padding: 12px;
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
        cursor: pointer;
        box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.2);
        transition: transform calc(var(--transition-duration, 300ms) * 0.7)
            ease-in-out,
          padding-right calc(var(--transition-duration, 300ms) * 0.7)
            ease-in-out,
          box-shadow calc(var(--transition-duration, 300ms) * 0.7) ease-in-out;
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
        width: 16px;
        height: 16px;
      }

      temba-icon {
        --icon-color: white;
      }

      .label {
        color: white;
        font-weight: 500;
        font-size: 16px;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        margin-left: 0;
        opacity: 0;
        transition: all var(--transition-duration, 300ms) ease-in-out;
      }

      .tab:hover .label {
        max-width: 200px;
        margin-left: 12px;
        opacity: 1;
      }
    `;
  }

  static TAB_HEIGHT = 50;
  static TAB_GAP = 10;
  static START_TOP = 100;
  static allTabs: FloatingTab[] = [];

  @property({ type: String })
  icon: string;

  @property({ type: String })
  label: string;

  @property({ type: String })
  color = '#6B7280';

  @property({ type: Number })
  order = 0;

  @state()
  top = 100;

  @property({ type: Boolean })
  hidden = false;

  connectedCallback() {
    super.connectedCallback();
    FloatingTab.allTabs.push(this);
    FloatingTab.updateAllPositions();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const index = FloatingTab.allTabs.indexOf(this);
    if (index > -1) {
      FloatingTab.allTabs.splice(index, 1);
    }
    FloatingTab.updateAllPositions();
  }

  private static updateAllPositions() {
    const sorted = [...FloatingTab.allTabs].sort((a, b) => a.order - b.order);
    sorted.forEach((tab, index) => {
      tab.top =
        FloatingTab.START_TOP +
        index * (FloatingTab.TAB_HEIGHT + FloatingTab.TAB_GAP);
    });
  }

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('hidden')) {
      this.classList.toggle('hidden', this.hidden);
    }
  }

  private handleClick() {
    // hide all tabs when one is clicked
    FloatingTab.allTabs.forEach((tab) => {
      tab.hidden = true;
    });

    this.fireCustomEvent(CustomEventType.ButtonClicked, {
      action: 'toggle'
    });
  }

  public static showAllTabs() {
    FloatingTab.allTabs.forEach((tab) => {
      tab.hidden = false;
    });
  }

  public static hideAllTabs() {
    FloatingTab.allTabs.forEach((tab) => {
      tab.hidden = true;
    });
  }

  public render(): TemplateResult {
    const tabStyle = `
      background-color: ${this.color};
      top: ${this.top}px;
    `;

    const classes = getClasses({
      tab: true,
      hidden: this.hidden
    });

    return html`
      <div class="${classes}" style="${tabStyle}" @click=${this.handleClick}>
        <div class="icon-container">
          ${this.icon
            ? html`<temba-icon size="1.5" name="${this.icon}"></temba-icon>`
            : ''}
        </div>
        <div class="label">${this.label}</div>
      </div>
    `;
  }
}
