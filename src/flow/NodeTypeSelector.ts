import { css, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { NODE_CONFIG, ACTION_CONFIG } from './config';
import { NodeConfig, ActionConfig } from './types';

/**
 * Event detail for node type selection
 */
export interface NodeTypeSelection {
  nodeType: string;
  position: { x: number; y: number };
}

/**
 * Categorizes node types for display
 */
interface NodeCategory {
  name: string;
  items: Array<{ type: string; config: NodeConfig | ActionConfig }>;
}

/**
 * NodeTypeSelector - A dialog for selecting which type of node to create
 * Shows categorized lists of available actions and splits
 */
export class NodeTypeSelector extends RapidElement {
  static get styles() {
    return css`
      :host {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10001;
        display: none;
      }

      :host([open]) {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .dialog {
        position: relative;
        background: white;
        border-radius: var(--curvature);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 700px;
        max-height: 80vh;
        width: 90%;
        display: flex;
        flex-direction: column;
      }

      .header {
        padding: 1.5em;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text-dark);
      }

      .content {
        overflow-y: auto;
        flex: 1;
        padding: 1.5em;
      }

      .category {
        margin-bottom: 2em;
      }

      .category:last-child {
        margin-bottom: 0;
      }

      .category-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: 0.75em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.9rem;
        opacity: 0.7;
      }

      .items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.75em;
      }

      .node-item {
        padding: 1em;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: calc(var(--curvature) * 0.75);
        cursor: pointer;
        transition: all 0.15s ease;
        background: white;
        position: relative;
        overflow: hidden;
      }

      .node-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: var(--item-color, rgba(0, 0, 0, 0.1));
      }

      .node-item:hover {
        border-color: var(--item-color, var(--color-primary));
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
      }

      .node-item:hover::before {
        width: 6px;
      }

      .node-item-title {
        font-weight: 500;
        font-size: 1rem;
        color: var(--color-text-dark);
        margin-bottom: 0.25em;
      }

      .node-item-type {
        font-size: 0.75rem;
        color: var(--color-text);
        opacity: 0.6;
        font-family: monospace;
      }

      .footer {
        padding: 1em 1.5em;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: flex-end;
      }

      temba-button {
        --button-y: 0.5em;
        --button-x: 1.25em;
      }
    `;
  }

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ type: String })
  public mode: 'action' | 'split' = 'action';

  @state()
  private clickPosition = { x: 0, y: 0 };

  public show(mode: 'action' | 'split', position: { x: number; y: number }) {
    this.mode = mode;
    this.clickPosition = position;
    this.open = true;
  }

  public close() {
    this.open = false;
  }

  private handleNodeTypeClick(nodeType: string) {
    this.fireCustomEvent(CustomEventType.Selection, {
      nodeType,
      position: this.clickPosition
    } as NodeTypeSelection);
    this.close();
  }

  private handleOverlayClick() {
    this.close();
  }

  private getCategories(): NodeCategory[] {
    if (this.mode === 'action') {
      // Group actions by category
      const items = Object.entries(ACTION_CONFIG)
        .filter(([_, config]) => config.name) // only show actions with names
        .map(([type, config]) => ({ type, config }));

      return [
        {
          name: 'Actions',
          items
        }
      ];
    } else {
      // Group splits by category
      const items = Object.entries(NODE_CONFIG)
        .filter(([type, config]) => {
          // exclude execute_actions (it's the default action-only node)
          return type !== 'execute_actions' && config.name;
        })
        .map(([type, config]) => ({ type, config }));

      return [
        {
          name: 'Splits',
          items
        }
      ];
    }
  }

  public render(): TemplateResult {
    if (!this.open) {
      return html``;
    }

    const categories = this.getCategories();
    const title =
      this.mode === 'action' ? 'Select an Action' : 'Select a Split';

    return html`
      <div class="overlay" @click=${this.handleOverlayClick}></div>
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="header">
          <h2>${title}</h2>
        </div>
        <div class="content">
          ${categories.map(
            (category) => html`
              <div class="category">
                <div class="category-title">${category.name}</div>
                <div class="items-grid">
                  ${category.items.map(
                    (item) => html`
                      <div
                        class="node-item"
                        style="--item-color: ${item.config.color ||
                        'rgba(0, 0, 0, 0.1)'}"
                        @click=${() => this.handleNodeTypeClick(item.type)}
                      >
                        <div class="node-item-title">${item.config.name}</div>
                        <div class="node-item-type">${item.type}</div>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          )}
        </div>
        <div class="footer">
          <temba-button @click=${this.close} secondary>Cancel</temba-button>
        </div>
      </div>
    `;
  }
}
