import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Shortcut } from '../interfaces';
import { StoreMonitorElement } from '../store/StoreMonitorElement';
import { Options } from '../display/Options';

export class ShortcutList extends StoreMonitorElement {
  static get styles() {
    return css`
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

  @property({ type: String })
  filter: string;

  @property({ type: Array })
  filteredShortcuts = [];

  @property({ type: Number })
  cursorIndex = 0;

  constructor() {
    super();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
  }

  public storeUpdated(): void {
    this.filteredShortcuts = this.store.getShortcuts();
  }

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);

    if (changes.has('filter')) {
      if (!this.filter) {
        this.filteredShortcuts = this.store.getShortcuts();
      } else {
        this.filteredShortcuts = this.store
          .getShortcuts()
          .filter((shortcut: Shortcut) =>
            shortcut.name.toLowerCase().includes(this.filter.toLowerCase())
          );
      }
      this.cursorIndex = 0;
    }
  }

  public renderShortcut(shortcut: Shortcut): TemplateResult {
    return html`<div style="display:flex;align-items: center;min-width:0">
      <div
        style="
          overflow: hidden;
          text-overflow: ellipsis;
          width:175px; 
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

  public getShortcut() {
    const options = this.shadowRoot.querySelector('temba-options') as Options;
    return options.getSelection();
  }

  public render(): TemplateResult {
    return html`
      ${this.filteredShortcuts.length === 0
        ? html`<div class="no-match">
            ${this.filter
              ? html`No matches for <span class="filter">${this.filter}</span>.`
              : html`No shortcuts yet, create some to quickly include them in
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
