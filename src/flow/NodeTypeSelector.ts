import { css, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { NODE_CONFIG, ACTION_CONFIG } from './config';
import {
  NodeConfig,
  ActionConfig,
  EDITOR_TYPES,
  ACTION_EDITOR_TYPES,
  SPLIT_EDITOR_TYPES
} from './types';

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
  description: string;
  color: string;
  items: Array<{ type: string; config: NodeConfig | ActionConfig }>;
  isBranching?: boolean; // true if this category contains actions that branch/split
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
        overflow-x: hidden;
        flex: 1;
        padding: 0;
      }

      .section-regular {
        padding: 1.5em;
      }

      .section-branching {
        background: linear-gradient(
          135deg,
          rgba(170, 170, 170, 0.12),
          rgba(170, 170, 170, 0.08)
        );
        padding: 1.5em;
        margin: 0 -1.5em;
        padding-left: 3em;
        padding-right: 3em;
      }

      .section-header {
        margin-bottom: 1.5em;
        padding-top: 1em;
      }

      .section-title {
        font-weight: 700;
        font-size: 1.1rem;
        color: var(--color-text-dark);
        margin-bottom: 0.35em;
        display: flex;
        align-items: center;
      }

      .section-title::before {
        content: '';
        display: inline-block;
        height: 1.2em;
        background: linear-gradient(
          135deg,
          var(--color-primary-dark),
          var(--color-primary)
        );
        border-radius: 2px;
      }

      .section-description {
        font-size: 0.9rem;
        color: var(--color-text);
        opacity: 0.7;
        margin-left: 0em;
        padding-bottom: 1em;
      }

      .category {
        margin-bottom: 2em;
      }

      .category:last-child {
        margin-bottom: 0;
      }

      .category-title {
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: 0.5em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.9rem;
        opacity: 0.7;
      }

      .category-description {
        font-size: 0.85rem;
        color: var(--color-text);
        opacity: 0.6;
        margin-bottom: 0.75em;
        line-height: 1.4;
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
      // Group actions by editor type
      const actionsByType = new Map<
        string,
        Array<{ type: string; config: ActionConfig }>
      >();
      const splitsByType = new Map<
        string,
        Array<{ type: string; config: NodeConfig }>
      >();

      // Collect regular actions (from ACTION_CONFIG, unless hideFromActions is true)
      Object.entries(ACTION_CONFIG)
        .filter(([_, config]) => {
          return config.name && !config.hideFromActions && config.editorType;
        })
        .forEach(([type, config]) => {
          const editorType = config.editorType;
          const key = editorType.title;
          if (!actionsByType.has(key)) {
            actionsByType.set(key, []);
          }
          actionsByType.get(key)!.push({ type, config });
        });

      // Collect nodes that have showAsAction=true (these appear as "with split" actions)
      Object.entries(NODE_CONFIG)
        .filter(([type, config]) => {
          return (
            type !== 'execute_actions' &&
            config.name &&
            config.showAsAction &&
            config.editorType
          );
        })
        .forEach(([type, config]) => {
          const editorType = config.editorType!;
          const key = editorType.title;
          if (!splitsByType.has(key)) {
            splitsByType.set(key, []);
          }
          splitsByType.get(key)!.push({ type, config });
        });

      // Build categories - first regular actions, then splitting actions
      const categories: NodeCategory[] = [];

      // Get the implicit order from ACTION_EDITOR_TYPES object
      const actionEditorOrder = Object.keys(ACTION_EDITOR_TYPES);
      // Get the implicit order of actions from ACTION_CONFIG
      const actionConfigOrder = Object.keys(ACTION_CONFIG);

      // Add regular action categories sorted by implicit order
      const sortedActionCategories = Array.from(actionsByType.entries()).sort(
        ([_keyA, itemsA], [_keyB, itemsB]) => {
          const titleA = itemsA[0].config.editorType.title;
          const titleB = itemsB[0].config.editorType.title;
          const orderA = actionEditorOrder.findIndex(
            (key) => ACTION_EDITOR_TYPES[key].title === titleA
          );
          const orderB = actionEditorOrder.findIndex(
            (key) => ACTION_EDITOR_TYPES[key].title === titleB
          );
          return (
            (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
          );
        }
      );

      sortedActionCategories.forEach(([_, items]) => {
        const editorType = items[0].config.editorType;
        // Sort items within the category by their order in ACTION_CONFIG
        const sortedItems = items.sort((a, b) => {
          const orderA = actionConfigOrder.indexOf(a.type);
          const orderB = actionConfigOrder.indexOf(b.type);
          return (
            (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
          );
        });
        categories.push({
          name: editorType.title,
          description: editorType.description,
          color: editorType.color,
          items: sortedItems,
          isBranching: false
        });
      });

      // Add splitting action categories (with modified description to indicate they split)
      // Also sorted by implicit order
      // Get the implicit order of nodes from NODE_CONFIG
      const nodeConfigOrder = Object.keys(NODE_CONFIG);

      const sortedSplitCategories = Array.from(splitsByType.entries()).sort(
        ([_keyA, itemsA], [_keyB, itemsB]) => {
          const titleA = itemsA[0].config.editorType!.title;
          const titleB = itemsB[0].config.editorType!.title;
          const orderA = actionEditorOrder.findIndex(
            (key) => ACTION_EDITOR_TYPES[key].title === titleA
          );
          const orderB = actionEditorOrder.findIndex(
            (key) => ACTION_EDITOR_TYPES[key].title === titleB
          );
          return (
            (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
          );
        }
      );

      sortedSplitCategories.forEach(([_, items]) => {
        const editorType = items[0].config.editorType!;
        // Sort items within the category by their order in NODE_CONFIG
        const sortedItems = items.sort((a, b) => {
          const orderA = nodeConfigOrder.indexOf(a.type);
          const orderB = nodeConfigOrder.indexOf(b.type);
          return (
            (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
          );
        });
        categories.push({
          name: editorType.title,
          description: editorType.description,
          color: editorType.color,
          items: sortedItems,
          isBranching: true
        });
      });

      return categories;
    } else {
      // Group splits by editor type
      const itemsByType = new Map<
        string,
        Array<{ type: string; config: NodeConfig }>
      >();

      Object.entries(NODE_CONFIG)
        .filter(([type, config]) => {
          // exclude execute_actions (it's the default action-only node)
          // exclude nodes that have showAsAction=true (they appear in action mode)
          return (
            type !== 'execute_actions' && config.name && !config.showAsAction
          );
        })
        .forEach(([type, config]) => {
          const editorType = config.editorType || EDITOR_TYPES.split;
          const key = editorType.title;
          if (!itemsByType.has(key)) {
            itemsByType.set(key, []);
          }
          itemsByType.get(key)!.push({ type, config });
        });

      // Convert to categories using editor type metadata, sorted by implicit order from SPLIT_EDITOR_TYPES
      const splitEditorOrder = Object.keys(SPLIT_EDITOR_TYPES);
      // Get the implicit order of nodes from NODE_CONFIG
      const nodeConfigOrder = Object.keys(NODE_CONFIG);

      return Array.from(itemsByType.entries())
        .map(([_, items]) => {
          const editorType = items[0].config.editorType || EDITOR_TYPES.split;
          // Sort items within the category by their order in NODE_CONFIG
          const sortedItems = items.sort((a, b) => {
            const orderA = nodeConfigOrder.indexOf(a.type);
            const orderB = nodeConfigOrder.indexOf(b.type);
            return (
              (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
            );
          });
          return {
            name: editorType.title,
            description: editorType.description,
            color: editorType.color,
            items: sortedItems
          };
        })
        .sort((a, b) => {
          const orderA = splitEditorOrder.findIndex(
            (key) => SPLIT_EDITOR_TYPES[key].title === a.name
          );
          const orderB = splitEditorOrder.findIndex(
            (key) => SPLIT_EDITOR_TYPES[key].title === b.name
          );
          return (
            (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
          );
        });
    }
  }

  public render(): TemplateResult {
    if (!this.open) {
      return html``;
    }

    const categories = this.getCategories();
    const title =
      this.mode === 'action' ? 'Select an Action' : 'Select a Split';

    // Separate regular and branching categories for action mode
    const regularCategories = categories.filter((c) => !c.isBranching);
    const branchingCategories = categories.filter((c) => c.isBranching);
    const hasBranchingSection = branchingCategories.length > 0;

    return html`
      <div class="overlay" @click=${this.handleOverlayClick}></div>
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="header">
          <h2>${title}</h2>
        </div>
        <div class="content">
          ${this.mode === 'action'
            ? html`
                <div class="section-regular">
                  ${regularCategories.map(
                    (category) => html`
                      <div class="category">
                        <div class="category-title">${category.name}</div>
                        <div class="category-description">
                          ${category.description}
                        </div>
                        <div class="items-grid">
                          ${category.items.map(
                            (item) => html`
                              <div
                                class="node-item"
                                style="--item-color: ${item.config.editorType
                                  ?.color || 'rgba(0, 0, 0, 0.1)'}"
                                @click=${() =>
                                  this.handleNodeTypeClick(item.type)}
                              >
                                <div class="node-item-title">
                                  ${item.config.name}
                                </div>
                                <div class="node-item-type">${item.type}</div>
                              </div>
                            `
                          )}
                        </div>
                      </div>
                    `
                  )}
                </div>
                ${hasBranchingSection
                  ? html`
                      <div class="section-branching">
                        <div class="section-header">
                          <div class="section-title">Actions that Branch</div>
                          <div class="section-description">
                            These actions also split the flow based on their
                            outcome
                          </div>
                        </div>
                        ${branchingCategories.map(
                          (category) => html`
                            <div class="category">
                              <div class="category-title">${category.name}</div>
                              <div class="category-description">
                                ${category.description}
                              </div>
                              <div class="items-grid">
                                ${category.items.map(
                                  (item) => html`
                                    <div
                                      class="node-item"
                                      style="--item-color: ${item.config
                                        .editorType?.color ||
                                      'rgba(0, 0, 0, 0.1)'}"
                                      @click=${() =>
                                        this.handleNodeTypeClick(item.type)}
                                    >
                                      <div class="node-item-title">
                                        ${item.config.name}
                                      </div>
                                      <div class="node-item-type">
                                        ${item.type}
                                      </div>
                                    </div>
                                  `
                                )}
                              </div>
                            </div>
                          `
                        )}
                      </div>
                    `
                  : ''}
              `
            : html`
                <div class="section-regular">
                  ${categories.map(
                    (category) => html`
                      <div class="category">
                        <div class="category-title">${category.name}</div>
                        <div class="category-description">
                          ${category.description}
                        </div>
                        <div class="items-grid">
                          ${category.items.map(
                            (item) => html`
                              <div
                                class="node-item"
                                style="--item-color: ${item.config.editorType
                                  ?.color || 'rgba(0, 0, 0, 0.1)'}"
                                @click=${() =>
                                  this.handleNodeTypeClick(item.type)}
                              >
                                <div class="node-item-title">
                                  ${item.config.name}
                                </div>
                                <div class="node-item-type">${item.type}</div>
                              </div>
                            `
                          )}
                        </div>
                      </div>
                    `
                  )}
                </div>
              `}
        </div>
        <div class="footer">
          <temba-button @click=${this.close} secondary>Cancel</temba-button>
        </div>
      </div>
    `;
  }
}
