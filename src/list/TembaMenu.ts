import { css, html, property, TemplateResult } from 'lit-element';
import { COOKIE_KEYS, getCookieBoolean, setCookie } from '../utils';
import { TembaList } from './TembaList';

export interface CountItem {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export class TembaMenu extends TembaList {
  static get styles() {
    return css`
      :host {
        width: 100%;
        --color-widget-bg-focused: transparent;
        --options-block-shadow: none;
      }

      temba-options {
        display: block;
        height: inherit;
        width: 100%;
      }

      .collapse-toggle {
        width: 0.5em;
        cursor: pointer;
        display: block;
        margin-right: 5px;
        margin-top: 3px;
        margin-bottom: 3px;
      }

      .collapse-toggle:hover {
        background: rgb(100, 100, 100, 0.05);
      }
    `;
  }

  @property({ type: Boolean })
  wraps = false;

  @property({ type: Boolean })
  collapsible = false;

  constructor() {
    super();
    this.valueKey = 'id';

    this.collapsed = getCookieBoolean(COOKIE_KEYS.MENU_COLLAPSED);

    this.renderOption = (
      countItem: CountItem,
      selected: boolean
    ): TemplateResult => {
      const styles = selected
        ? 'color: var(--color-primary-dark); --icon-color: var(--color-primary-dark)'
        : '';

      const icon = html`<temba-icon
        style="margin-right: 0.5em; transition: 200ms all ease-in-out"
        name="${countItem.icon}"
      ></temba-icon>`;

      return html`<div style="display: flex; ${styles}">
        ${this.collapsed
          ? html`<temba-tip
              style="display:flex;"
              text="${countItem.name}"
              position="right"
              >${icon}</temba-tip
            >`
          : icon}

        <div
          class="name"
          style="flex-grow:1; white-space: ${this.wraps ? 'normal' : 'nowrap'};"
        >
          ${countItem.name}
        </div>
        ${countItem.count || countItem.count == 0
          ? html`
              <div
                class="count"
                style="align-self:center; border-radius: var(--curvature); margin-left:1em; padding: 0.05em 0.5em; font-size: .8em; font-weight:400;"
              >
                ${countItem.count.toLocaleString()}
              </div>
            `
          : null}
      </div>`;
    };
  }

  public toggleCollapsed() {
    this.collapsed = !this.collapsed;
    setCookie(COOKIE_KEYS.MENU_COLLAPSED, this.collapsed);
  }

  public render(): TemplateResult {
    const menu = super.render();

    if (this.collapsible) {
      return html`
        <div style="display:flex">
          ${menu}
          <div class="collapse-toggle" @click=${this.toggleCollapsed}></div>
        </div>
      `;
    }

    return html`<div style="margin-right:0.5em">${menu}</div>`;
  }
}
