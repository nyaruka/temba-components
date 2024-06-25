import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
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

      .tabs {
        display: flex;
        align-items: stretch;
      }

      .tab {
        user-select: none;
        padding: 0.5em 0.7em;
        margin: 0em 0em;
        cursor: pointer;
        display: flex;
        font-size: 1.01em;
        align-items: center;
        border-radius: var(--curvature);
        border-bottom-right-radius: 0px;
        border-bottom-left-radius: 0px;
        border: 0px solid rgba(0, 0, 0, 0.45);
        color: var(--color-text-dark);
        --icon-color: var(--color-text-dark);
        white-space: nowrap;
        transition: all 100ms linear;
      }

      .focusedname .tab .name {
        transition: all 0s linear !important;
      }

      .focusedname .tab.selected .name {
        transition: all 200ms linear !important;
      }

      .tab.hidden {
        display: none;
      }

      .tab temba-icon {
      }

      .tab .name {
        margin-left: 0.4em;
        max-width: 80px;
        overflow: hidden;
        transition: max-width 500ms ease-in-out, margin 500ms ease-in-out;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .tab .badge {
        margin-left: 0.4em;
      }

      @media (max-width: 900px) {
        .collapses .tab .name {
          max-width: 0px;
          margin: 0;
        }
      }

      @media (max-width: 600px) {
        .collapses .tab .badge {
          display: none;
        }
      }

      .focusedname .tab.selected {
        transform: none;
      }

      .focusedname .tab .name {
        max-width: 0px;
        margin: 0;
        transition: max-width 200ms linear, margin 200ms linear;
      }

      .focusedname .tab.selected .name {
        margin-left: 0.4em;
        max-width: 200px;
      }

      .tab {
        transform: scale(0.9) translate(0em, -0.05em);
        --icon-color: #aaa;
        color: #aaa;
      }

      .tab.selected {
      }

      .tab.selected,
      .tab.selected:hover {
        cursor: default;
        box-shadow: 0px -3px 3px 1px rgba(0, 0, 0, 0.02);
        background: var(--focused-tab-color, #fff);
        transform: scale(1) translateY(0em);
        --icon-color: #666;
        color: #666;
      }

      .bottom .tab.selected {
      }

      .unselect .tab.selected {
        cursor: pointer;
      }

      .unselect .tab.selected:hover {
        background: var(--unselect-tab-color, #eee);
      }

      .tab:hover {
        --icon-color: #666;
        color: #666;
        background: rgba(0, 0, 0, 0.02);
      }

      .pane {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: var(--focused-tab-color, #fff);
        border-radius: var(--curvature);
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

      .badge {
      }

      .count {
        border-radius: 99px;
        background: rgba(0, 0, 0, 0.05);
        color: rgba(0, 0, 0, 0.5);
        font-size: 0.6em;
        font-weight: 400;
        padding: 0.1em 0.4em;
        min-width: 1em;
        text-align: center;
      }

      .notify .count {
        background: var(--color-alert);
        color: #fff;
      }

      .bottom.tabs .tab {
        border-radius: 0em;
      }

      .bottom.pane {
        border-radius: 0em;
      }

      .bottom.pane.first {
        border-bottom-left-radius: 0px;
      }

      .bottom .tab.first {
        border-bottom-left-radius: var(--curvature);
      }

      .embedded.pane {
        box-shadow: none;
        margin: 0;
      }

      .embedded.tabs {
        margin: 0;
      }

      .embedded .tab {
      }

      .embedded.tabs .tab.selected {
        box-shadow: none !important;
      }

      .embedded.pane {
        // padding: 0.3em;
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

  // are the tabs on the bottom of the pane?
  @property({ type: Boolean })
  bottom = false;

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
  tabs: Tab[] = [];

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
    this.tabs = tabs;
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
    if (changedProperties.has('index') || changedProperties.has('tabs')) {
      this.tabs.forEach((tab, index) => {
        tab.selected = index == this.index;
      });
      this.fireEvent(CustomEventType.ContextChanged);
    }

    // if our current tab is hidden, select the first visible one
    if (this.index > this.tabs.length) {
      const tab = this.tabs[this.index];
      if (tab && tab.hidden) {
        for (let i = 0; i < this.tabs.length; i++) {
          const other = this.tabs[i];
          if (other && !other.hidden) {
            this.index = i;
            return;
          }
        }
      }
    }
  }

  public setTabDetails(
    index: number,
    details: { count: number; hidden: boolean }
  ) {
    if (index < this.tabs.length) {
      const tab = this.tabs[index];
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
    return this.tabs[this.index];
  }

  public getTab(index: number): Tab {
    return this.tabs[index];
  }

  public handleTabContentChanged() {
    this.requestUpdate();
  }

  public render(): TemplateResult {
    return html`
      ${this.bottom
        ? html`<div
            class="pane ${getClasses({
              first: this.index == 0,
              embedded: this.embedded,
              bottom: this.bottom
            })}"
          >
            <slot></slot>
          </div>`
        : null}

      <div
        class="tabs ${getClasses({
          tabs: true,
          bottom: this.bottom,
          collapses: this.collapses,
          embedded: this.embedded,
          focusedname: this.focusedName,
          unselect: this.unselect
        })}"
      >
        ${this.tabs.map(
          (tab, index) => html`
            <div
              @click=${this.handleTabClick}
              data-index=${index}
              class="${getClasses({
                tab: true,
                first: index == 0,
                selected: index == this.index,
                hidden: tab.hidden,
                notify: tab.notify
              })}"
              style="${tab.selectionColor && index == this.index
                ? `color:${tab.selectionColor};--icon-color:${tab.selectionColor};`
                : ''} ${tab.selectionBackground && index == this.index
                ? `background-color:${tab.selectionBackground};`
                : ''}"
            >
              ${tab.icon ? html`<temba-icon name=${tab.icon} />` : null}
              <div class="name">${tab.name}</div>
              ${tab.hasBadge()
                ? html`
                    <div class="badge">
                      ${tab.count > 0
                        ? html`<div class="count">
                            ${tab.count.toLocaleString()}
                          </div>`
                        : null}
                    </div>
                  `
                : null}
              ${tab.checked
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
      ${!this.bottom
        ? html`<div
            class="pane ${getClasses({
              first: this.index == 0,
              embedded: this.embedded,
              bottom: this.bottom
            })}"
          >
            <slot></slot>
          </div>`
        : null}
    `;
  }
}
