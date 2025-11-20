import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { StickyNote as StickyNoteData } from '../store/flow-definition';
import { getStore } from '../store/Store';
import { AppState, fromStore, zustand } from '../store/AppState';
import { isRTLLanguage } from '../utils';

export class StickyNote extends RapidElement {
  @property({ type: String })
  public uuid: string;

  @property({ type: Object })
  public data: StickyNoteData;

  @property({ type: Boolean })
  private dragging = false;

  @property({ type: Boolean })
  public selected = false;

  @property({ type: Boolean })
  private colorPickerExpanded = false;

  @fromStore(zustand, (state: AppState) => state.isTranslating)
  private isTranslating!: boolean;

  @fromStore(zustand, (state: AppState) => state.languageCode)
  private languageCode!: string;

  static get styles() {
    return css`
      :host {
        --sticky-color: #fef08a;
        --sticky-border-color: #facc15;
        --sticky-text-color: #451a03;
        --curvature: 8px;
      }

      .sticky-note {
        width: 182px;
        background-color: var(--sticky-color);
        border: 1px solid var(--sticky-border-color);
        border-radius: var(--curvature);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          sans-serif;
        font-size: 12px;
        overflow: hidden;
        transition: transform 0.1s ease, box-shadow 0.2s ease;
        color: var(--sticky-text-color);
        opacity: 0.85;
      }

      .sticky-note.dragging {
        opacity: 0.7;
        z-index: 1000;
        transform: rotate(0deg);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      }

      .sticky-note:hover {
        transform: translateY(0px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      /* Color themes */
      .sticky-note.yellow {
        --sticky-color: #fef08a;
        --sticky-border-color: #facc15;
        --sticky-text-color: #451a03;
      }
      .sticky-note.blue {
        --sticky-color: #bfdbfe;
        --sticky-border-color: #3b82f6;
        --sticky-text-color: #1e3a8a;
      }
      .sticky-note.pink {
        --sticky-color: #fce7f3;
        --sticky-border-color: #ec4899;
        --sticky-text-color: #831843;
      }
      .sticky-note.green {
        --sticky-color: #d1fae5;
        --sticky-border-color: #10b981;
        --sticky-text-color: #064e3b;
      }
      .sticky-note.gray {
        --sticky-color: #f3f4f6;
        --sticky-border-color: #6b7280;
        --sticky-text-color: #374151;
      }

      /* Title and body containers */
      .sticky-title-container {
        position: relative;
        border-bottom: 1px solid var(--sticky-border-color);
        background-color: rgba(255, 255, 255, 0.5);
        display: flex;
        align-items: center;
      }
      .sticky-body-container {
        position: relative;
      }

      /* Editable fields */
      [contenteditable='true'] {
        margin: 2px;
        padding: 4px 8px;
        outline: none;
        border-radius: var(--curvature);
        transition: background 0.2s;
      }
      [contenteditable='true']:focus {
        background-color: rgba(255, 255, 255, 0.8);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        outline-color: var(--sticky-border-color);
      }
      [contenteditable='true'].rtl {
        direction: rtl;
        text-align: right;
      }

      /* Title */
      .sticky-title {
        font-weight: 600;
        font-size: 13px;
        color: var(--sticky-text-color);
        min-height: 20px;
        line-height: 20px;
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
        flex-grow: 1;
        padding: 4px 8px !important;
        margin: 2px;
        padding-left: 8px;
      }
      .sticky-title:empty::before {
        content: 'Click to add title';
        opacity: 0.5;
        font-style: italic;
      }
      .sticky-title:focus {
        border-bottom-left-radius: 0px;
        border-bottom-right-radius: 0px;
      }

      /* Body */
      .sticky-body {
        padding: 8px 10px;
        color: var(--sticky-text-color);
        line-height: 1.4;
        min-height: 48px;
        word-wrap: break-word;
        white-space: pre-wrap;
        margin: 2px;
      }
      .sticky-body:empty::before {
        content: 'Click to add note';
        opacity: 0.5;
        font-style: italic;
      }
      .sticky-body:focus {
        border-top-left-radius: 0px;
        border-top-right-radius: 0px;
      }

      /* Drag icon */
      .sticky-title-container > .drag-handle {
        --icon-color: var(--sticky-border-color);
        cursor: move;
        max-width: 20px;
        padding-left: 8px;
        overflow: hidden;
        transition: all 0.2s ease;
      }

      .sticky-note:hover .drag-handle {
      }

      .sticky-note:focus-within .sticky-title-container > .drag-handle {
      }

      /* Focus/active states */
      .sticky-note:focus-within {
        box-shadow: 0 0 0 1px var(--sticky-border-color),
          0 10px 20px rgba(0, 0, 0, 0.3);
      }

      .sticky-note:focus-within .drag-handle {
        max-width: 0px;
        padding-left: 0px;
      }

      /* Color picker */
      .color-picker {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        border: 1px solid rgba(0, 0, 0, 0.2);

        border-radius: 3px;
        background-color: var(--sticky-color);
        cursor: pointer;
        transition: transform 0.2s ease;
      }

      .color-picker:hover {
        transform: scale(1.1);
      }

      .color-options {
        position: absolute;
        bottom: 0;
        right: 0;
        display: flex;
        gap: 4px;
        background-color: rgba(255, 255, 255, 0.9);
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 3px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform-origin: bottom right;
        transform: scale(0);
        opacity: 0;
        transition: transform 0.2s ease, opacity 0.2s ease;
        z-index: 1000;
      }

      .color-options.expanded {
        transform: scale(1);
        opacity: 1;
      }

      .color-option {
        width: 12px;
        height: 12px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 3px;
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }

      .color-option:hover {
        transform: scale(1.1);
        border-color: rgba(0, 0, 0, 0.4);
      }

      .color-option.yellow {
        background-color: #fef08a;
      }

      .color-option.blue {
        background-color: #bfdbfe;
      }

      .color-option.pink {
        background-color: #fce7f3;
      }

      .color-option.green {
        background-color: #d1fae5;
      }

      .color-option.gray {
        background-color: #f3f4f6;
      }
    `;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('data') || changes.has('uuid')) {
      this.updateCanvasSize();
    }
  }

  private updateCanvasSize(): void {
    if (!this.data) {
      return;
    }

    const element = this.querySelector('.sticky-note');
    if (element) {
      const rect = element.getBoundingClientRect();
      getStore()
        .getState()
        .expandCanvas(
          this.data.position.left + rect.width,
          this.data.position.top + rect.height
        );
    }
  }

  private handleTitleBlur(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const newTitle = target.textContent || '';

    if (this.data && newTitle !== this.data.title) {
      getStore()
        .getState()
        .updateStickyNote(this.uuid, {
          ...this.data,
          title: newTitle
        });
    }
    this.requestUpdate();
  }

  private handleBodyBlur(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const newBody = target.textContent || '';

    if (this.data && newBody !== this.data.body) {
      getStore()
        .getState()
        .updateStickyNote(this.uuid, {
          ...this.data,
          body: newBody
        });
    }
    this.requestUpdate();
  }

  private handleContentMouseDown(event: MouseEvent): void {
    // If this sticky note is selected, don't stop propagation
    // so that group dragging can work
    if (this.selected) {
      return;
    }
    // Otherwise, stop propagation to enable editing
    event.stopPropagation();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
    if (event.key === 'Escape') {
      (event.target as HTMLElement).blur();
    }
  }

  private handleColorPickerMouseEnter(): void {
    this.colorPickerExpanded = true;
  }

  private handleColorPickerMouseLeave(): void {
    this.colorPickerExpanded = false;
  }

  private handleColorOptionClick(
    event: MouseEvent,
    color: 'yellow' | 'blue' | 'pink' | 'green' | 'gray'
  ): void {
    event.stopPropagation();

    if (this.data && color !== this.data.color) {
      getStore()
        .getState()
        .updateStickyNote(this.uuid, {
          ...this.data,
          color: color
        });
    }

    this.colorPickerExpanded = false;
    this.requestUpdate();
  }

  public render(): TemplateResult {
    if (!this.data) {
      return html`<div class="sticky-note" style="display: none;"></div>`;
    }

    const style = `left: ${this.data.position.left}px; top: ${this.data.position.top}px;`;

    return html`
      <div
        class="sticky-note ${this.data.color} ${this.dragging
          ? 'dragging'
          : ''}"
        style="${style}"
        data-uuid="${this.uuid}"
      >
        <div class="sticky-title-container">
          <temba-icon name="drag" class="drag-handle"></temba-icon>
          <div
            class="sticky-title ${this.isTranslating && isRTLLanguage(this.languageCode) ? 'rtl' : ''}"
            contenteditable="${!this.isTranslating}"
            @blur="${this.handleTitleBlur}"
            @keydown="${this.handleKeyDown}"
            @mousedown="${this.handleContentMouseDown}"
            .textContent="${this.data.title}"
          ></div>
        </div>
        <div class="sticky-body-container">
          <div
            class="sticky-body ${this.isTranslating && isRTLLanguage(this.languageCode) ? 'rtl' : ''}"
            contenteditable="${!this.isTranslating}"
            @blur="${this.handleBodyBlur}"
            @keydown="${this.handleKeyDown}"
            @mousedown="${this.handleContentMouseDown}"
            .textContent="${this.data.body}"
          ></div>
          ${!this.isTranslating
            ? html`<div class="edit-icon" title="Edit note"></div>`
            : ''}

          <!-- Color picker -->
          <div
            class="color-picker"
            @mouseenter="${this.handleColorPickerMouseEnter}"
            @mouseleave="${this.handleColorPickerMouseLeave}"
          >
            <div
              class="color-options ${this.colorPickerExpanded
                ? 'expanded'
                : ''}"
            >
              <div
                class="color-option yellow"
                @click="${(e: MouseEvent) =>
                  this.handleColorOptionClick(e, 'yellow')}"
              ></div>
              <div
                class="color-option blue"
                @click="${(e: MouseEvent) =>
                  this.handleColorOptionClick(e, 'blue')}"
              ></div>
              <div
                class="color-option pink"
                @click="${(e: MouseEvent) =>
                  this.handleColorOptionClick(e, 'pink')}"
              ></div>
              <div
                class="color-option green"
                @click="${(e: MouseEvent) =>
                  this.handleColorOptionClick(e, 'green')}"
              ></div>
              <div
                class="color-option gray"
                @click="${(e: MouseEvent) =>
                  this.handleColorOptionClick(e, 'gray')}"
              ></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
