import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { EDITOR_CONFIG, UIConfig } from './config';
import { Action, Exit, Node, NodeUI, Router } from '../store/flow-definition';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { Plumber } from './Plumber';
import { getStore } from '../store/Store';
import { CustomEventType } from '../interfaces';

const DRAG_THRESHOLD = 5;

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

  // Track exits that are in "removing" state
  private exitRemovalTimeouts: Map<string, number> = new Map();

  // Set of exit UUIDs that are in the removing state
  private exitRemovingState: Set<string> = new Set();

  // Track actions that are in "removing" state
  private actionRemovalTimeouts: Map<string, number> = new Map();

  // Set of action UUIDs that are in the removing state
  private actionRemovingState: Set<string> = new Set();

  // Track action click state to distinguish from drag
  private actionClickStartPos: { x: number; y: number } | null = null;
  private pendingActionClick: { action: Action; event: MouseEvent } | null =
    null;

  static get styles() {
    return css`

      .node {
        background-color: #fff;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        min-width: 200px;
        border-radius: var(--curvature);
        
        color: #333;
        cursor: move;
        user-select: none;

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
        position: relative;
      }

      .action .remove-button {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-error, #dc3545);
        color: white;
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        line-height: 1;
        z-index: 10;
      }

      .action:hover .remove-button {
        display: flex;
      }

      .action.removing .title {
        background-color: var(--color-error, #dc3545) !important;
      }

      .action.removing .title .name {
        color: white;
      }

      .action.sortable {
        display: flex;
        align-items: stretch;
      }

      .action .action-content {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-width: 0; /* Allow flex item to shrink below its content size */
        overflow: hidden;
      }

      .action .body {
        padding: 1em;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        white-space: normal;
        overflow: hidden;
      }

      .action .drag-handle {
        opacity: 0;
        transition: all 200ms ease-in-out;
        cursor: move;
        background: rgba(0, 0, 0, 0.02);
        max-width:0px;
        position: absolute;
      }

      .action:hover .drag-handle {
        opacity: 0.5;
        padding: 0.25em;
        max-width: 20px;
      }

      .action .drag-handle:hover {
        opacity: 1;
        
      }

      .action .title,
      .router .title {
        display: flex;
        color: #fff;
        padding: 5px 1px;
        text-align: center;
        font-size: 1em;
        font-weight: normal;

      }

      .title .name {
        flex-grow: 1;
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
        display: flex;
        flex-direction: column;
      }

      .action-exits {
        padding-bottom: 0.6em;
        margin-top: -0.8em;
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
      
      .exit-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        margin-bottom: -1.2em;
        padding-top:0.2em;
      }

      .exit {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: tomato;
        position: relative;
        box-shadow: 0 2px 2px rgba(0, 0, 0, .1);
        cursor: pointer;
        pointer-events: none;
      }

      .exit.jtk-connected {
        background: var(--color-connectors, #e6e6e6);
      }

      .exit.connected {
        background-color: #fff;
        pointer-events: all;
      }

      .exit.connected:hover {
        background-color: var(--color-connectors, #e6e6e6);
      }
      
      .exit.removing, .exit.removing:hover {
        background-color: var(--color-error);
        pointer-events: all;
      }
      
      .exit.removing::before {
        content: '✕';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 8px;
        color: white;
        line-height: 1;
      }
      
      /* Connector in removing state */
      :host {
        --color-connector-removing: var(--color-error);
      }
      
      body svg.plumb-connector.removing path {
        stroke: var(--color-connector-removing, tomato) !important;
        stroke-width: 3px;
      }
      
      body .plumb-connector.removing .plumb-arrow {
        fill: var(--color-connector-removing, tomato) !important;
        stroke: var(--color-connector-removing, transparent) !important;
      }

      .category:first-child {
        border-bottom-left-radius: var(--curvature);
      }

      .category:last-child {
        border-bottom-right-radius: var(--curvature);
      }

      .router .title {
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
      }

      .action{
        overflow: hidden;
      }

      .action:first-child .title {
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
      }
  }`;
  }

  constructor() {
    super();
    this.handleActionOrderChanged = this.handleActionOrderChanged.bind(this);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('node')) {
      // make our initial connections
      if (changes.get('node') === undefined) {
        for (const exit of this.node.exits) {
          if (!exit.destination_uuid) {
            this.plumber.makeSource(exit.uuid);
          } else {
            this.plumber.connectIds(
              this.node.uuid,
              exit.uuid,
              exit.destination_uuid
            );
          }
        }
      }

      const ele = this.parentElement;
      const rect = ele.getBoundingClientRect();

      getStore()
        ?.getState()
        .expandCanvas(
          this.ui.position.left + rect.width,
          this.ui.position.top + rect.height
        );
    }
  }

  disconnectedCallback() {
    // Remove the event listener when the component is removed
    super.disconnectedCallback();

    // Clear any pending exit removal timeouts
    this.exitRemovalTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.exitRemovalTimeouts.clear();

    // Clear any pending action removal timeouts
    this.actionRemovalTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.actionRemovalTimeouts.clear();

    // Clear the removing state
    this.exitRemovingState.clear();
    this.actionRemovingState.clear();
  }

  private handleExitClick(event: MouseEvent, exit: Exit) {
    event.preventDefault();
    event.stopPropagation();

    const exitId = exit.uuid;

    // If exit is not connected, do nothing
    if (!exit.destination_uuid) return;

    // If the exit is already in removing state, perform the disconnect
    if (this.exitRemovingState.has(exitId)) {
      this.disconnectExit(exit);
      return;
    }

    // Start removal UI state
    this.exitRemovingState.add(exitId);
    this.requestUpdate();

    // Set the connection to removing state
    this.plumber.setConnectionRemovingState(exitId, true);

    // Clear any existing timeout for this exit
    if (this.exitRemovalTimeouts.has(exitId)) {
      clearTimeout(this.exitRemovalTimeouts.get(exitId));
    }

    // Set timeout to reset UI if user doesn't click
    const timeoutId = window.setTimeout(() => {
      this.exitRemovingState.delete(exitId);
      this.exitRemovalTimeouts.delete(exitId);

      // Reset the connection to normal state
      this.plumber.setConnectionRemovingState(exitId, false);

      this.requestUpdate();
    }, 1500);

    this.exitRemovalTimeouts.set(exitId, timeoutId);
  }

  private disconnectExit(exit: Exit) {
    const exitId = exit.uuid;

    // Clear the UI state
    this.exitRemovingState.delete(exitId);

    // Reset the connection to normal state (this will be redundant as we're about to remove it,
    // but it's safer to do this in case there's any timing issue)
    this.plumber.setConnectionRemovingState(exitId, false);

    // Clear any timeout
    if (this.exitRemovalTimeouts.has(exitId)) {
      clearTimeout(this.exitRemovalTimeouts.get(exitId));
      this.exitRemovalTimeouts.delete(exitId);
    }

    // Remove the JSPlumb connection
    this.plumber.removeExitConnection(exitId);

    // Update the flow definition
    const updatedExit = { ...exit, destination_uuid: null };
    const updatedExits = this.node.exits.map((e) =>
      e.uuid === exitId ? updatedExit : e
    );

    // Update the node
    const updatedNode = { ...this.node, exits: updatedExits };
    getStore()?.getState().updateNode(this.node.uuid, updatedNode);

    // Request update to reflect changes
    this.requestUpdate();
  }

  private handleActionRemoveClick(
    event: MouseEvent,
    action: Action,
    index: number
  ) {
    event.preventDefault();
    event.stopPropagation();

    const actionId = action.uuid;

    // If the action is already in removing state, perform the removal
    if (this.actionRemovingState.has(actionId)) {
      this.removeAction(action, index);
      return;
    }

    // Start removal UI state
    this.actionRemovingState.add(actionId);
    this.requestUpdate();

    // Clear any existing timeout for this action
    if (this.actionRemovalTimeouts.has(actionId)) {
      clearTimeout(this.actionRemovalTimeouts.get(actionId));
    }

    // Set timeout to reset UI if user doesn't click
    const timeoutId = window.setTimeout(() => {
      this.actionRemovingState.delete(actionId);
      this.actionRemovalTimeouts.delete(actionId);
      this.requestUpdate();
    }, 1000); // 1 second as per requirements

    this.actionRemovalTimeouts.set(actionId, timeoutId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private removeAction(action: Action, _index: number) {
    const actionId = action.uuid;

    // Clear the UI state
    this.actionRemovingState.delete(actionId);

    // Clear any timeout
    if (this.actionRemovalTimeouts.has(actionId)) {
      clearTimeout(this.actionRemovalTimeouts.get(actionId));
      this.actionRemovalTimeouts.delete(actionId);
    }

    // Remove the action from the node
    const updatedActions = this.node.actions.filter((a) => a.uuid !== actionId);

    // If no actions remain, remove the entire node
    if (updatedActions.length === 0) {
      this.fireCustomEvent(CustomEventType.NodeDeleted, {
        uuid: this.node.uuid
      });
    } else {
      // Update the node with remaining actions
      const updatedNode = { ...this.node, actions: updatedActions };
      getStore()?.getState().updateNode(this.node.uuid, updatedNode);

      // Request update to reflect changes
      this.requestUpdate();
    }
  }

  private handleActionOrderChanged(event: CustomEvent) {
    const [fromIdx, toIdx] = event.detail.swap;

    // swap our actions
    const newActions = [...this.node.actions];
    const movedAction = newActions.splice(fromIdx, 1)[0];
    newActions.splice(toIdx, 0, movedAction);

    // udate our internal reprensentation, this isn't strictly necessary
    // since the editor will update us from it's definition subscription
    // but it makes testing a lot easier
    this.node = { ...this.node, actions: newActions };

    getStore()
      ?.getState()
      .updateNode(this.node.uuid, { ...this.node, actions: newActions });
  }

  private handleActionMouseDown(event: MouseEvent, action: Action): void {
    // Don't handle clicks on the remove button or when action is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      this.actionRemovingState.has(action.uuid)
    ) {
      return;
    }

    // Store the starting position and action for later comparison
    // Don't prevent default - let the Editor's drag system work normally
    this.actionClickStartPos = { x: event.clientX, y: event.clientY };
    this.pendingActionClick = { action, event };
  }

  private handleActionMouseUp(event: MouseEvent, action: Action): void {
    // Don't handle if we don't have a pending click or if it's not the same action
    if (
      !this.pendingActionClick ||
      this.pendingActionClick.action.uuid !== action.uuid
    ) {
      this.actionClickStartPos = null;
      this.pendingActionClick = null;
      return;
    }

    // Don't handle clicks on the remove button or when action is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      this.actionRemovingState.has(action.uuid)
    ) {
      this.actionClickStartPos = null;
      this.pendingActionClick = null;
      return;
    }

    // Check if the mouse moved beyond the drag threshold
    if (this.actionClickStartPos) {
      const deltaX = event.clientX - this.actionClickStartPos.x;
      const deltaY = event.clientY - this.actionClickStartPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Check if the Editor is currently in dragging mode
      const editor = this.closest('temba-flow-editor') as any;
      const editorWasDragging = editor?.dragging;

      // Only fire the action edit event if we haven't dragged beyond the threshold
      // AND either there's no Editor parent (test case) or the Editor didn't drag the node
      if (distance <= DRAG_THRESHOLD && (!editor || !editorWasDragging)) {
        // Fire event to request action editing
        this.fireCustomEvent(CustomEventType.ActionEditRequested, {
          action,
          nodeUuid: this.node.uuid
        });
      }
    }

    // Clean up
    this.actionClickStartPos = null;
    this.pendingActionClick = null;
  }

  private handleActionClick(event: MouseEvent, action: Action): void {
    // This method is kept for backward compatibility but should not be used
    // The new mousedown/mouseup approach handles click vs drag properly
    event.preventDefault();
    event.stopPropagation();

    // Don't handle clicks on the remove button or when action is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      this.actionRemovingState.has(action.uuid)
    ) {
      return;
    }

    // Fire event to request action editing
    this.fireCustomEvent(CustomEventType.ActionEditRequested, {
      action,
      nodeUuid: this.node.uuid
    });
  }

  private renderTitle(config: UIConfig, isRemoving: boolean = false) {
    return html`<div class="title" style="background:${config.color}">
      ${this.node?.actions?.length > 1
        ? html`<temba-icon class="drag-handle" name="sort"></temba-icon>`
        : null}

      <div class="name">${isRemoving ? 'Remove?' : config.name}</div>
    </div>`;
  }

  private renderAction(node: Node, action: Action, index: number) {
    const config = EDITOR_CONFIG[action.type];
    const isRemoving = this.actionRemovingState.has(action.uuid);

    if (config) {
      return html`<div
        class="action sortable ${action.type} ${isRemoving ? 'removing' : ''}"
        id="action-${index}"
      >
        <button
          class="remove-button"
          @click=${(e: MouseEvent) =>
            this.handleActionRemoveClick(e, action, index)}
          title="Remove action"
        >
          ✕
        </button>
        <div
          class="action-content"
          @mousedown=${(e: MouseEvent) => this.handleActionMouseDown(e, action)}
          @mouseup=${(e: MouseEvent) => this.handleActionMouseUp(e, action)}
          style="cursor: pointer;"
        >
          ${this.renderTitle(config, isRemoving)}
          <div class="body">
            ${config.render
              ? config.render(node, action)
              : html`<pre>${action.type}</pre>`}
          </div>
        </div>
      </div>`;
    }
    return html`<div
      class="action sortable ${isRemoving ? 'removing' : ''}"
      id="action-${index}"
    >
      <button
        class="remove-button"
        @click=${(e: MouseEvent) =>
          this.handleActionRemoveClick(e, action, index)}
        title="Remove action"
      >
        ✕
      </button>
      ${action.type}
    </div>`;
  }

  private renderRouter(router: Router, ui: NodeUI) {
    const config = EDITOR_CONFIG[ui.type];
    if (config) {
      return html`<div class="router">
        ${this.renderTitle(config, false)}
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
    return html`<div class="exit-wrapper">
      <div
        id="${exit.uuid}"
        class=${getClasses({
          exit: true,
          connected: !!exit.destination_uuid,
          removing: this.exitRemovingState.has(exit.uuid)
        })}
        @click=${(e: MouseEvent) => this.handleExitClick(e, exit)}
      ></div>
    </div>`;
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
        ${this.node.actions.length > 0
          ? html`<temba-sortable-list
              dragHandle="drag-handle"
              @temba-order-changed="${this.handleActionOrderChanged}"
            >
              ${this.node.actions.map((actionSpec, index) => {
                return this.renderAction(this.node, actionSpec, index);
              })}
            </temba-sortable-list>`
          : ''}
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
