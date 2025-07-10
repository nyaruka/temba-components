import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { StoreMonitorElement } from '../store/StoreMonitorElement';
export class ShortcutList extends StoreMonitorElement {
    static get styles() {
        return css `
      temba-options {
        display: block;
        width: 100%;
        flex-grow: 1;
      }

      .options-empty {
        height: 0;
        overflow: hidden;
      }

      .no-match {
        margin: 5px 10px;
        padding: 10px;
      }

      .filter {
        background: #f3f3f3;
        padding: 0.1em 0.3em;
        border-radius: var(--curvature);
      }
    `;
    }
    constructor() {
        super();
        this.filteredShortcuts = [];
        this.cursorIndex = 0;
    }
    firstUpdated(changes) {
        super.firstUpdated(changes);
    }
    storeUpdated() {
        this.filteredShortcuts = this.store.getShortcuts();
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('filter')) {
            if (!this.filter) {
                this.filteredShortcuts = this.store.getShortcuts();
            }
            else {
                this.filteredShortcuts = this.store
                    .getShortcuts()
                    .filter((shortcut) => shortcut.name.toLowerCase().includes(this.filter.toLowerCase()));
            }
            this.cursorIndex = 0;
        }
    }
    renderShortcut(shortcut) {
        return html `<div style="display:flex;align-items: center;min-width:0">
      <div
        style="
          overflow: hidden;
          text-overflow: ellipsis;
          width:100px; 
          padding-right: 10px;
          white-space: nowrap;"
      >
        ${shortcut.name}
      </div>
      <div
        style=" 
          font-size: 0.9em;
          color: rgba(0, 0, 0, 0.4);
          flex:1;
          overflow: hidden;
          text-overflow: ellipsis;

          display: -webkit-box;
          line-height: 16px;
          max-height: 16px;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        "
      >
        ${shortcut.text}
      </div>
    </div>`;
    }
    getShortcut() {
        const options = this.shadowRoot.querySelector('temba-options');
        return options.getSelection();
    }
    render() {
        return html `
      ${this.filteredShortcuts.length === 0
            ? html `<div class="no-match">
            ${this.filter
                ? html `No matches for <span class="filter">${this.filter}</span>.`
                : html `No shortcuts yet, create some to quickly include them in
                your messages.`}
          </div>`
            : null}

      <temba-options
        class="options-${this.filteredShortcuts.length === 0
            ? 'empty'
            : 'full'}"
        block
        cursorHover
        visible
        .renderOption=${this.renderShortcut}
        .cursorIndex=${this.cursorIndex}
        .options=${this.filteredShortcuts}
      ></temba-options>
    `;
    }
}
__decorate([
    property({ type: String })
], ShortcutList.prototype, "filter", void 0);
__decorate([
    property({ type: Array })
], ShortcutList.prototype, "filteredShortcuts", void 0);
__decorate([
    property({ type: Number })
], ShortcutList.prototype, "cursorIndex", void 0);
//# sourceMappingURL=ShortcutList.js.map