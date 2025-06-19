import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { StickyNote as StickyNoteData, FlowPosition } from '../store/flow-definition';
import { getStore } from '../store/Store';
import { createDragHandler, addDragEventListeners, removeDragEventListeners, DragState } from './DragMixin';

export class StickyNote extends RapidElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: String })
  public uuid: string;

  @property({ type: Object })
  public data: StickyNoteData;

  private dragHandler: DragState & { handleMouseDown: (event: MouseEvent) => void } | null = null;
  private isEditingTitle = false;
  private isEditingBody = false;

  static get styles() {
    return css`
      .sticky-note {
        position: absolute;
        width: 200px;
        min-height: 100px;
        background-color: var(--sticky-color);
        border: 1px solid var(--sticky-border-color);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        cursor: move;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        overflow: hidden;
        transition: transform 0.1s ease;
        z-index: 100;
      }

      .sticky-note:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .sticky-note.dragging {
        z-index: 1000;
        transform: rotate(2deg);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      }

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

      .sticky-title {
        padding: 8px 10px 4px 10px;
        font-weight: 600;
        font-size: 13px;
        color: var(--sticky-text-color);
        border-bottom: 1px solid var(--sticky-border-color);
        background-color: rgba(255, 255, 255, 0.2);
        min-height: 20px;
        line-height: 20px;
      }

      .sticky-body {
        padding: 8px 10px;
        color: var(--sticky-text-color);
        line-height: 1.4;
        min-height: 40px;
        word-wrap: break-word;
        white-space: pre-wrap;
      }

      .sticky-title[contenteditable="true"],
      .sticky-body[contenteditable="true"] {
        outline: 2px solid var(--sticky-border-color);
        outline-offset: -2px;
        background-color: rgba(255, 255, 255, 0.5);
      }

      .sticky-title:empty::before {
        content: "Click to add title";
        color: rgba(var(--sticky-text-color), 0.5);
        font-style: italic;
      }

      .sticky-body:empty::before {
        content: "Click to add note";
        color: rgba(var(--sticky-text-color), 0.5);
        font-style: italic;
      }
    `;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('data') || changes.has('uuid')) {
      this.setupDragHandling();
      this.updateCanvasSize();
    }
  }

  private setupDragHandling(): void {
    if (this.dragHandler) {
      removeDragEventListeners(this.dragHandler);
    }

    if (!this.data || !this.uuid) {
      return;
    }

    this.dragHandler = createDragHandler(
      this.uuid,
      () => this.data.position,
      (uuid: string, position: FlowPosition) => {
        getStore().getState().updateStickyPosition(uuid, position);
      },
      {
        onDragStart: () => {
          const element = this.querySelector('.sticky-note') as HTMLElement;
          if (element) {
            element.classList.add('dragging');
          }
        },
        onDragEnd: () => {
          const element = this.querySelector('.sticky-note') as HTMLElement;
          if (element) {
            element.classList.remove('dragging');
          }
        }
      }
    );

    const element = this.querySelector('.sticky-note') as HTMLElement;
    if (element && this.dragHandler) {
      addDragEventListeners(element, this.dragHandler);
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

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.dragHandler) {
      removeDragEventListeners(this.dragHandler);
    }
  }

  private handleTitleClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isEditingTitle) {
      this.startEditingTitle();
    }
  }

  private handleBodyClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isEditingBody) {
      this.startEditingBody();
    }
  }

  private startEditingTitle(): void {
    this.isEditingTitle = true;
    this.requestUpdate();
    
    setTimeout(() => {
      const titleElement = this.querySelector('.sticky-title') as HTMLElement;
      if (titleElement) {
        titleElement.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 0);
  }

  private startEditingBody(): void {
    this.isEditingBody = true;
    this.requestUpdate();
    
    setTimeout(() => {
      const bodyElement = this.querySelector('.sticky-body') as HTMLElement;
      if (bodyElement) {
        bodyElement.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(bodyElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 0);
  }

  private handleTitleBlur(event: FocusEvent): void {
    this.isEditingTitle = false;
    const target = event.target as HTMLElement;
    const newTitle = target.textContent || '';
    
    if (this.data && newTitle !== this.data.title) {
      getStore().getState().updateStickyNote(this.uuid, {
        ...this.data,
        title: newTitle
      });
    }
    this.requestUpdate();
  }

  private handleBodyBlur(event: FocusEvent): void {
    this.isEditingBody = false;
    const target = event.target as HTMLElement;
    const newBody = target.textContent || '';
    
    if (this.data && newBody !== this.data.body) {
      getStore().getState().updateStickyNote(this.uuid, {
        ...this.data,
        body: newBody
      });
    }
    this.requestUpdate();
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

  public render(): TemplateResult {
    if (!this.data) {
      return html`<div class="sticky-note" style="display: none;"></div>`;
    }

    const style = `left: ${this.data.position.left}px; top: ${this.data.position.top}px;`;

    return html`
      <div 
        class="sticky-note ${this.data.color}" 
        style="${style}"
        data-uuid="${this.uuid}"
      >
        <div 
          class="sticky-title"
          contenteditable="${this.isEditingTitle}"
          @click="${this.handleTitleClick}"
          @blur="${this.handleTitleBlur}"
          @keydown="${this.handleKeyDown}"
          .textContent="${this.data.title}"
        ></div>
        <div 
          class="sticky-body"
          contenteditable="${this.isEditingBody}"
          @click="${this.handleBodyClick}"
          @blur="${this.handleBodyBlur}"
          @keydown="${this.handleKeyDown}"
          .textContent="${this.data.body}"
        ></div>
      </div>
    `;
  }
}