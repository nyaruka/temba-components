import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { getClasses } from '../utils';

export class FloatingWindow extends RapidElement {
  static get styles() {
    return css`
      :host {
        position: fixed;
        z-index: 9998;
        transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
      }

      :host(.hidden) {
        transform: translateX(100%);
        opacity: 0;
        pointer-events: none;
      }

      .window {
        background: white;
        border-radius: 8px;
        box-shadow: -4px 4px 20px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .window.dragging {
        user-select: none;
        cursor: move;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--color-primary-light, #f3f4f6);
        border-bottom: 1px solid var(--color-widget-border, #e5e7eb);
        cursor: move;
        user-select: none;
      }

      .title {
        font-weight: 600;
        font-size: 16px;
        color: var(--color-text-dark, #1f2937);
      }

      .close-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 150ms ease-in-out;
      }

      .close-button:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .close-button temba-icon {
        --icon-color: var(--color-text, #4b5563);
      }

      .body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
    `;
  }

  @property({ type: String })
  title = '';

  @property({ type: Number })
  width = 250;

  @property({ type: Number })
  height = 700;

  @property({ type: Number })
  top = 100;

  @property({ type: Number })
  left = -1; // -1 means calculate from right side

  @property({ type: Boolean })
  hidden = true;

  @property({ type: Boolean })
  dragging = false;

  private dragStartX = 0;
  private dragStartY = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private initialTop = 0;
  private initialLeft = 0;

  public firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    
    // calculate initial position from right side
    if (this.left === -1) {
      this.left = window.innerWidth - this.width - 20;
    }
    
    // store initial position
    this.initialTop = this.top;
    this.initialLeft = this.left;
    
    // set initial hidden class
    this.classList.toggle('hidden', this.hidden);
  }

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('hidden')) {
      this.classList.toggle('hidden', this.hidden);
      
      // reset position to initial when showing (only if we have stored initial values)
      if (!this.hidden && changes.get('hidden') && this.initialTop !== 0) {
        this.top = this.initialTop;
        this.left = this.initialLeft;
      }
    }
  }

  private handleClose() {
    this.hidden = true;
    this.fireCustomEvent(CustomEventType.DialogHidden);
  }

  private handleHeaderMouseDown(event: MouseEvent) {
    // don't start drag if clicking on close button
    if ((event.target as HTMLElement).closest('.close-button')) {
      return;
    }

    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragOffsetX = this.left;
    this.dragOffsetY = this.top;

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    event.preventDefault();
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.dragging) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    this.left = this.dragOffsetX + deltaX;
    this.top = this.dragOffsetY + deltaY;

    // keep window within viewport bounds
    this.left = Math.max(0, Math.min(this.left, window.innerWidth - this.width));
    this.top = Math.max(0, Math.min(this.top, window.innerHeight - 100));
  };

  private handleMouseUp = () => {
    this.dragging = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  public show() {
    this.hidden = false;
  }

  public hide() {
    this.hidden = true;
  }

  public render(): TemplateResult {
    const windowStyle = `
      width: ${this.width}px;
      height: ${this.height}px;
      top: ${this.top}px;
      left: ${this.left}px;
    `;

    const windowClasses = getClasses({
      window: true,
      dragging: this.dragging
    });

    return html`
      <div class="${windowClasses}" style="${windowStyle}">
        <div class="header" @mousedown=${this.handleHeaderMouseDown}>
          <div class="title">${this.title}</div>
          <button class="close-button" @click=${this.handleClose}>
            <temba-icon name="x"></temba-icon>
          </button>
        </div>
        <div class="body">
          <slot></slot>
        </div>
      </div>
    `;
  }
}
