import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { EDITOR_CONFIG, UIConfig } from './config';
import { Action, Exit, Node, NodeUI, Router } from '../store/flow-definition';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { Plumber } from './Plumber';
import { getStore } from '../store/Store';

export class EditorNode extends RapidElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Object })
  private plumber: Plumber;

  @property({ type: Object })
  private node: Node;

  @property({ type: Object })
  private ui: NodeUI;

  // Drag state properties
  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private nodeStartPos = { left: 0, top: 0 };

  // Bound event handlers to maintain proper 'this' context
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);

  /**
   * Snaps a coordinate value to the nearest 20px grid position
   */
  private snapToGrid(value: number): number {
    return Math.round(value / 20) * 20;
  }

  static get styles() {
    return css`
      .node {
        position: absolute;
        background-color: #fff;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        min-width: 200px;
        border-radius: calc(var(--curvature) * 1.5);
        overflow: hidden;
        color: #333;
        cursor: move;
        user-select: none;
        z-index: 500;
      }

      .node:hover {
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
      }

      .node.dragging {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
        transform: scale(1.02);
        z-index: 1000;
      }
        
      .action {
        max-width: 200px;
      }

      .action .body {
        padding: 1em;
      }

      .action .title,
      .router .title {
        color: #fff;
        padding: 5px 1px;
        text-align: center;
        font-size: 1em;
        font-weight: normal;
      }

      .quick-replies {
        margin-top: 0.5em;
      }

      .quick-reply {
        background-color: #f0f0f0;
        border: 1px solid #e0e0e0;
        border-radius: calc(var(--curvature) * 1.5);
        padding: 0.2em 1em;
        display: inline-block;
        font-size: 0.8em;
        margin: 0.2em;
      }

      .categories {
        display: flex;
        flex-direction: row;

      }

      .category {
        margin:-1px -0.5px;
        border: 1px solid #f3f3f3;
        padding: 0.75em;
        flex-grow:1;
        text-align: center;
      }

      .action-exits {
        padding-bottom: 0.75em;
        margin-top: -0.75em;
      }

      .category .title {
        font-weight: normal;
        font-size: 1em;
      }

      .router .body {
        padding: 0.75em;
      }

      .result-name {
        font-weight: bold;
        display: inline-block;
      }
      
      .exit {
        padding-top: 10px;
        margin-bottom: -10px;
      }
  }`;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('node')) {
      this.plumber.makeTarget(this.node.uuid);

      // our node was changed, see if we have new destinations
      for (const exit of this.node.exits) {
        if (!exit.destination_uuid) {
          this.plumber.makeSource(exit.uuid);
        } else {
          this.plumber.connectIds(exit.uuid, exit.destination_uuid);
        }
      }

      const ele = this.querySelector('.node');
      const rect = ele.getBoundingClientRect();

      getStore()
        .getState()
        .expandCanvas(
          this.ui.position.left + rect.width,
          this.ui.position.top + rect.height
        );

      // Add drag event listeners to the node
      this.addDragEventListeners();
    }
  }

  private addDragEventListeners(): void {
    const nodeElement = this.querySelector('.node') as HTMLElement;
    if (!nodeElement) return;

    nodeElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseDown(event: MouseEvent): void {
    // Only start dragging if clicking on the node itself, not on exits or other interactive elements
    const target = event.target as HTMLElement;
    if (target.classList.contains('exit') || target.closest('.exit')) {
      return;
    }

    this.isDragging = true;
    this.dragStartPos = { x: event.clientX, y: event.clientY };
    this.nodeStartPos = {
      left: this.ui.position.left,
      top: this.ui.position.top
    };

    // Add dragging class for visual feedback
    const nodeElement = this.querySelector('.node') as HTMLElement;
    if (nodeElement) {
      nodeElement.classList.add('dragging');
    }

    // Elevate connections for this node during dragging
    if (this.plumber) {
      this.plumber.elevateNodeConnections(this.node.uuid);
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;

    const newLeft = this.nodeStartPos.left + deltaX;
    const newTop = this.nodeStartPos.top + deltaY;

    // Snap to 20px grid
    const snappedLeft = this.snapToGrid(newLeft);
    const snappedTop = this.snapToGrid(newTop);

    // Update the UI position temporarily (for visual feedback)
    const nodeElement = this.querySelector('.node') as HTMLElement;
    if (nodeElement) {
      nodeElement.style.left = `${snappedLeft}px`;
      nodeElement.style.top = `${snappedTop}px`;
    }

    // Repaint connections during dragging for smooth updates
    if (this.plumber) {
      this.plumber.repaintEverything();
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;

    // Remove dragging class
    const nodeElement = this.querySelector('.node') as HTMLElement;
    if (nodeElement) {
      nodeElement.classList.remove('dragging');
    }

    // Restore normal z-index for connections
    if (this.plumber) {
      this.plumber.restoreNodeConnections(this.node.uuid);
    }

    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;

    const newLeft = this.nodeStartPos.left + deltaX;
    const newTop = this.nodeStartPos.top + deltaY;

    // Snap to 20px grid for final position
    const snappedLeft = this.snapToGrid(newLeft);
    const snappedTop = this.snapToGrid(newTop);

    // Update the store with the new snapped position
    const newPosition = { left: snappedLeft, top: snappedTop };
    getStore()
      .getState()
      .updateCanvasPositions({
        [this.node.uuid]: newPosition
      });

    // Repaint connections if plumber is available
    if (this.plumber) {
      this.plumber.repaintEverything();
    }

    getStore().getState().updateNodePosition(this.node.uuid, newPosition);

    // Fire a custom event with the new coordinates
    /*this.fireCustomEvent(CustomEventType.Moved, {
      nodeId: this.node.uuid,
      position: newPosition,
      oldPosition: {
        left: this.nodeStartPos.left,
        top: this.nodeStartPos.top
      }
    });*/
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clean up event listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private renderTitle(config: UIConfig) {
    return html`<div class="title" style="background:${config.color}">
      ${config.name}
    </div>`;
  }

  private renderAction(node: Node, action: Action) {
    const config = EDITOR_CONFIG[action.type];

    if (config) {
      return html`<div class="action ${action.type}">
        ${this.renderTitle(config)}
        <div class="body">
          ${config.render
            ? config.render(node, action)
            : html`<pre>${action.type}</pre>`}
        </div>
      </div>`;
    }
    return html`<div>${action.type}</div>`;
  }

  private renderRouter(router: Router, ui: NodeUI) {
    const config = EDITOR_CONFIG[ui.type];
    if (config) {
      return html`<div class="router">
        ${this.renderTitle(config)}
        ${router.result_name
          ? html`<div class="body">
              Save as
              <div class="result-name">${router.result_name}</div>
            </div>`
          : null}
      </div>`;
    }
  }

  private renderCategories(node: Node) {
    if (!node.router || !node.router.categories) {
      return null;
    }
    const categories = node.router.categories.map((category) => {
      const exit = node.exits.find(
        (exit: Exit) => exit.uuid == category.exit_uuid
      );

      return html`<div class="category">
        <div class="title">${category.name}</div>
        ${this.renderExit(exit)}
      </div>`;
    });

    return html`<div class="categories">${categories}</div>`;
  }

  private renderExit(exit: Exit): TemplateResult {
    return html`<div
      id="${exit.uuid}"
      class=${getClasses({
        exit: true,
        connected: !!exit.destination_uuid
      })}
    ></div>`;
  }

  public render() {
    if (!this.node || !this.ui) {
      return html`<div class="node">Loading...</div>`;
    }

    return html`
      <div
        id="${this.node.uuid}"
        class="node"
        style="left:${this.ui.position.left}px;top:${this.ui.position.top}px"
      >
        ${this.node.actions.map((actionSpec) => {
          return this.renderAction(this.node, actionSpec);
        })}
        ${this.node.router
          ? html` ${this.renderRouter(this.node.router, this.ui)}
            ${this.renderCategories(this.node)}`
          : html`<div class="action-exits">
              ${this.node.exits.map((exit) => {
                return this.renderExit(exit);
              })}
            </div>`}
      </div>
    `;
  }
}
