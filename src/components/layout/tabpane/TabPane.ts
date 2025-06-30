import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../../../shared/interfaces';
import { RapidElement } from '../../../components/base/RapidElement';
import { getClasses } from '../../../shared/utils/index';
import { Tab } from './Tab';

export class TabPane extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        flex-grow: 1;
      }

      .options {
        display: flex;
        align-items: stretch;
        padding: var(--temba-tabs-options-padding, 0);
        border-bottom: none;
      }

      .option {
        user-select: none;
        padding: 0.5em 0.7em;
        margin: 0em 0em;
        cursor: pointer;
        display: flex;
        font-size: 1.1em;
        align-items: center;
        border: 1px inset transparent;
        border-bottom: 0px;
        border-radius: var(--curvature);
        border-bottom-right-radius: 0px;
        border-bottom-left-radius: 0px;

        color: var(--color-text-dark);
        --icon-color: var(--color-text-dark);
        white-space: nowrap;
        transition: all 100ms linear;
      }

      .focusedname .option .name {
        transition: all 0s linear !important;
      }

      .focusedname .option.selected .name {
        transition: all 200ms linear !important;
      }

      .option.hidden {
        display: none;
      }

      .option temba-icon {
      }

      .option .name {
        margin-left: 0.4em;
        max-width: 200px;
        overflow: hidden;
        transition: max-width 500ms ease-in-out, margin 500ms ease-in-out;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .option .badge {
        margin-left: 0.4em;
      }

      @media (max-width: 900px) {
        .collapses .option .name {
          max-width: 0px;
          margin: 0;
        }
      }

      @media (max-width: 600px) {
        .collapses .option .badge {
          display: none;
        }
      }

      .focusedname .option.selected {
      }

      .focusedname .option .name {
        max-width: 0px;
        margin: 0;
        transition: max-width 200ms linear, margin 200ms linear;
      }

      .focusedname .option.selected .name {
        margin-left: 0.4em;
        max-width: 200px;
      }

      .option {
        transform: scale(0.9) translateY(0em);
        --icon-color: rgba(0, 0, 0, 0.5);
        color: rgba(0, 0, 0, 0.5);
      }

      .option.selected {
      }

      .option.selected,
      .option.selected:hover {
        cursor: default;
        box-shadow: 0px -3px 3px 1px rgba(0, 0, 0, 0.02);

        background: var(--focused-tab-color, #fff);
        transform: scale(1) translateY(1px);
        --icon-color: #666;
        color: #666;
        border: 1px inset rgba(0, 0, 0, 0.15);
        border-bottom: 0px;
      }

      .option.selected .dot {
        display: none;
      }

      .unselect .option.selected {
        cursor: pointer;
      }

      .unselect .option.selected:hover {
        background: var(--unselect-tab-color, #eee);
      }

      .option:hover {
        --icon-color: #666;
        color: #666;
        background: rgba(0, 0, 0, 0.02);
      }

      .option.dirty {
        font-weight: 500;
      }

      .pane {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: var(--focused-tab-color, #fff);
        border-bottom-left-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
        overflow: hidden;

        box-shadow: var(
          --tabs-shadow,
          rgba(0, 0, 0, 0.1) 0px 1px 3px 0px,
          rgba(0, 0, 0, 0.03) 0px 1px 2px 0px
        );
        min-height: 0;
      }

      .pane.first {
        border-top-left-radius: 0px;
        overflow: hidden;
      }

      .count {
        border-radius: 99px;
        background: rgba(0, 0, 0, 0.1);
        color: rgba(0, 0, 0, 0.5);
        font-size: 0.7em;
        font-weight: 500;
        min-width: 1.5em;
        text-align: center;
      }

      .dot {
        height: 0.5em;
        width: 0.5em;
        margin-left: 0.2em;
        background: var(--color-primary-dark);
        border-radius: 99px;
      }

      .notify .count {
        background: var(--color-alert);
        color: #fff;
      }

      .alert {
        color: var(--color-alert);
        --icon-color: var(--color-alert);
      }

      .embedded.pane {
        box-shadow: none;
        margin: 0;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
      }

      .embedded .option {
        border-bottom: none !important;
        border-radius: 0em;
        border-top: none !important;
      }

      .embedded .option.first {
        margin-left: 0em;
        border-top: none !important;
        border-left: none;
      }

      .embedded.options .option.selected {
        box-shadow: none !important;
      }

      .check {
        margin-left: 0.4em;
      }

      .pane {
        display: flex;
      }
    `;
  }

  @property({ type: Boolean })
  embedded = false;

  @property({ type: Boolean })
  collapses = false;

  // do we allow unselecting the current tab
  @property({ type: Boolean })
  unselect = false;

  // Only shows the name if the tab is focused
  @property({ type: Boolean })
  focusedName = false;

  @property({ type: Number })
  index = -1;

  @property({ type: String })
  refresh = '';

  @property({ type: Array, attribute: false })
  options: Tab[] = [];

  private handleTabClick(event: MouseEvent): void {
    const newIndex = parseInt(
      (event.currentTarget as HTMLDivElement).dataset.index
    );

    if (this.unselect && this.index === newIndex) {
      this.index = -1;
    } else {
      this.index = newIndex;
    }

    event.preventDefault();
    event.stopPropagation();
    this.requestUpdate('index');
  }

  public handleSlotChange() {
    const tabs: Tab[] = [];
    for (const t of this.children) {
      if (t.tagName === 'TEMBA-TAB') {
        const tab = t as Tab;
        tabs.push(tab);
      }
    }
    this.options = tabs;
    this.index = 0;
  }

  public firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    this.shadowRoot.addEventListener(
      'slotchange',
      this.handleSlotChange.bind(this)
    );
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('options')) {
      this.options.forEach((tab, index) => {
        tab.selected = index == this.index;
      });
    }

    if (changedProperties.has('index')) {
      if (this.options.length >= 0) {
        if (this.index !== changedProperties.get('index')) {
          this.options.forEach((tab, index) => {
            tab.selected = index == this.index;
          });
          this.fireEvent(CustomEventType.ContextChanged);
        }
      }
    }

    // if our current tab is hidden, select the first visible one
    if (this.index > this.options.length) {
      const tab = this.options[this.index];
      if (tab && tab.hidden) {
        for (let i = 0; i < this.options.length; i++) {
          const other = this.options[i];
          if (other && !other.hidden) {
            this.index = i;
            return;
          }
        }
      }
    }
  }

  public focusTab(name: string): Tab {
    const index = this.options.findIndex((tab) => tab.name === name);
    if (index >= 0) {
      this.index = index;
      return this.getTab(index);
    }
  }

  public setTabDetails(
    index: number,
    details: { count: number; hidden: boolean }
  ) {
    if (index < this.options.length) {
      const tab = this.options[index];
      tab.count = details.count;
      tab.hidden = details.hidden;
      this.requestUpdate();
    } else {
      // not ready yet, set the tab details later
      setTimeout(() => {
        this.setTabDetails(index, details);
      }, 100);
    }
  }

  public getCurrentTab(): Tab {
    return this.options[this.index];
  }

  public getTab(index: number): Tab {
    return this.options[index];
  }

  public handleTabContentChanged() {
    this.requestUpdate();
  }

  public handleTabDetailsChanged() {
    this.requestUpdate();
  }

  public render(): TemplateResult {
    const activeTab = this.options[this.index];
    return html`
      <div
        class="${getClasses({
          options: true,
          collapses: this.collapses,
          embedded: this.embedded,
          focusedname: this.focusedName,
          unselect: this.unselect
        })}"
      >
        ${this.options.map(
          (tab, index) => html`
            <div
              @click=${this.handleTabClick}
              data-index=${index}
              class="${getClasses({
                option: true,
                first: index == 0,
                selected: index == this.index,
                hidden: tab.hidden,
                notify: tab.notify,
                alert: tab.alert,
                dirty: tab.dirty
              })}"
              style="${tab.selectionColor && index == this.index
                ? `color:${tab.selectionColor};--icon-color:${tab.selectionColor};`
                : ''} ${tab.selectionBackground && index == this.index
                ? `background-color:${tab.selectionBackground};`
                : ''}"
            >
              ${tab.icon ? html`<temba-icon name=${tab.icon} />` : null}
              <div class="name">${tab.name} ${tab.dirty ? ` *` : ``}</div>
              ${tab.hasBadge()
                ? html`
                    <div class="badge">
                      ${tab.count > 0 && !tab.activity
                        ? html`<div class="count">
                            ${tab.activity ? '' : tab.count.toLocaleString()}
                          </div>`
                        : null}
                      ${tab.activity && tab.count > 0 && !tab.dirty
                        ? html`<div
                            class="dot"
                            style="background:${tab.activityColor}"
                          ></div>`
                        : null}
                    </div>
                  `
                : null}
              ${tab.checked && !tab.alert
                ? html`<temba-icon class="check" name="check"></temba-icon>`
                : null}
            </div>
          `
        )}

        <div style="flex-grow:1"></div>
        <div style="display:flex; align-items:center">
          <slot name="tab-right"></slot>
        </div>
      </div>
      <div
        @temba-details-changed=${this.handleTabDetailsChanged}
        style="${activeTab?.borderColor
          ? `
            border-top: var(--temba-tabs-border-top, 1px solid ${
              activeTab?.borderColor || 'var(--color-widget-border)'
            });

            border-left: var(--temba-tabs-border-left, 1px solid ${
              activeTab?.borderColor || 'var(--color-widget-border)'
            });

            border-bottom: var(--temba-tabs-border-bottom, 1px solid ${
              activeTab?.borderColor || 'var(--color-widget-border)'
            });

            border-right: var(--temba-tabs-border-right, 1px solid ${
              activeTab?.borderColor || 'var(--color-widget-border)'
            });

            `
          : ''} ${activeTab?.selectionBackground
          ? `background:${activeTab?.selectionBackground};`
          : ``}"
        class="pane ${getClasses({
          first: this.index == 0,
          embedded: this.embedded
        })}"
      >
        <slot></slot>
        <slot name="pane-bottom"></slot>
      </div>
    `;
  }
}
