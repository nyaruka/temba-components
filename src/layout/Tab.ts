import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';

export class Tab extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: none;
        flex-direction: column;
        min-height: 0;
        pointer-events: none;
        box-sizing: border-box;
      }

      :host(.selected) {
        display: flex;
        flex-grow: 1;
        pointer-events: auto;
      }

      :host(.split) {
        display: flex;
        flex-grow: 0;
        pointer-events: auto;
        min-width: 0;
        overflow: hidden;
        /* inherited by pane content so long unbreakable strings wrap
           instead of clipping or scrolling sideways */
        overflow-wrap: anywhere;
      }

      /* pane content can never be laid out wider than the pane itself */
      :host(.split) ::slotted(*) {
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }

      /* pulled panes render as cards with their title bar inside, the card
         colors can be themed per tab via the --tab-card vars. the border is
         applied inline by the containing temba-tabs since page-level resets
         (e.g. tailwind preflight) override :host borders */
      :host(.split.pane-card) {
        margin: 0.75rem 0 0;
        background: var(--tab-card-bg, var(--surface, #fff));
        border-radius: var(--r-sm, 4px);
        box-shadow: var(
          --shadow-2,
          0 1px 1px rgba(15, 22, 36, 0.04),
          0 4px 12px rgba(15, 22, 36, 0.06)
        );
      }

      .header {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: rgba(0, 0, 0, 0.04);
        color: var(--text-2);
        --icon-color: var(--text-2);
        font-size: 13px;
        font-weight: var(--w-medium);
        user-select: none;
      }

      .header.grab {
        cursor: grab;
      }

      .header .name {
        margin-left: 0.4em;
      }
    `;
  }

  @property({ type: String })
  name: string;

  @property({ type: String })
  icon: string;

  @property({ type: Boolean })
  selected = false;

  @property({ type: Boolean })
  alert = false;

  @property({ type: Boolean })
  hidden = false;

  @property({ type: Boolean })
  hideEmpty = false;

  // show just that there is activity instead of count
  @property({ type: Boolean })
  activity = false;

  @property({ type: Number })
  count = 0;

  @property({ type: Boolean })
  checked = false;

  @property({ type: Boolean })
  dirty = false;

  // when this tab is the first in a split view, cap its pane at this width
  @property({ type: Number })
  maxWidth = 0;

  // the minimum width this tab needs to be pulled into a split view alongside
  // the tabs before it, tabs without one are never split
  @property({ type: Number })
  splitWidth = 0;

  // whether this tab is currently shown as a pane in a split view, managed by
  // the containing temba-tabs
  @property({ type: Boolean })
  split = false;

  // our position in the split view, managed by the containing temba-tabs
  @property({ type: Number, attribute: false })
  splitIndex = -1;

  // pinned tabs keep their position and can't be reordered
  @property({ type: Boolean })
  pinned = false;

  // whether our pane header can be grabbed to reorder panes, managed by the
  // containing temba-tabs
  @property({ type: Boolean, attribute: false })
  headerGrab = false;

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('selected')) {
      this.classList.toggle('selected', this.selected);
    }
    if (changes.has('split')) {
      this.classList.toggle('split', this.split);
    }
    if (changes.has('split') || changes.has('splitIndex')) {
      // the first pane anchors the view and styles itself, the rest are
      // cards. namespaced to avoid colliding with page-level .card styles
      this.classList.toggle('pane-card', this.split && this.splitIndex > 0);
    }
  }

  public hasBadge() {
    return this.count > 0;
  }

  public handleDetailsChanged(event: CustomEvent) {
    if ('dirty' in event.detail) {
      this.dirty = event.detail.dirty;
    }
    if ('count' in event.detail) {
      this.count = event.detail.count;
      if (this.hideEmpty) {
        this.hidden = this.count === 0;
      }
    }
  }

  private handleHeaderDown(event: MouseEvent) {
    if (!this.headerGrab) {
      return;
    }
    event.preventDefault();
    this.fireCustomEvent(CustomEventType.DragStart, {
      tab: this,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  public render(): TemplateResult {
    // panes pulled into a split view keep their identity with a small header
    return html`${this.split && this.splitIndex > 0
        ? html`<div
            class="${getClasses({ header: true, grab: this.headerGrab })}"
            @mousedown=${this.handleHeaderDown}
          >
            ${this.icon
              ? html`<temba-icon name=${this.icon}></temba-icon>`
              : null}
            <div class="name">${this.name}</div>
          </div>`
        : null}<slot
        @temba-details-changed=${this.handleDetailsChanged}
        class="${getClasses({ selected: this.selected })}"
      ></slot> `;
  }
}
