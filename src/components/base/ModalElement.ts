import { property } from 'lit/decorators.js';
import { css } from 'lit';
import { ResizeElement } from './ResizeElement';

/**
 * ModalElement is a base class for components that display modal overlays
 * and dialogs. It provides common modal behavior like backdrop handling,
 * z-index management, and visibility states.
 */
export class ModalElement extends ResizeElement {
  @property({ type: Boolean })
  open = false;

  @property({ type: Boolean })
  loading = false;

  @property({ type: String })
  size = 'medium';

  static get modalSizes(): { [size: string]: string } {
    return {
      small: '400px',
      medium: '600px',
      large: '800px'
    };
  }

  static get styles() {
    return css`
      :host {
        position: fixed;
        z-index: 10000;
        font-family: var(--font-family);
      }

      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease-in-out;
      }

      .modal-backdrop.open {
        opacity: 1;
        pointer-events: all;
      }

      .modal-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: var(--curvature);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 90vw;
        max-height: 90vh;
        overflow: hidden;
      }
    `;
  }

  public close() {
    this.open = false;
    this.fireCustomEvent('close');
  }

  public show() {
    this.open = true;
    this.fireCustomEvent('open');
  }

  protected getModalWidth(): string {
    return ModalElement.modalSizes[this.size] || ModalElement.modalSizes.medium;
  }
}