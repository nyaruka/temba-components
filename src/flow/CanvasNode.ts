import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { ACTION_CONFIG, ActionConfig, NODE_CONFIG, NodeConfig } from './config';
import { ACTION_GROUP_METADATA, SPLIT_GROUP_METADATA } from './types';
import { Action, Exit, Node, NodeUI, Router } from '../store/flow-definition';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { Plumber } from './Plumber';
import { getStore } from '../store/Store';
import { CustomEventType } from '../interfaces';

const DRAG_THRESHOLD = 5;

export class CanvasNode extends RapidElement {
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

  // Track node click state to distinguish from drag
  private nodeClickStartPos: { x: number; y: number } | null = null;
  private pendingNodeClick: { event: MouseEvent } | null = null;

  // Track external action drag (action being dragged from another node)
  private externalDragInfo: {
    action: Action;
    sourceNodeUuid: string;
    actionIndex: number;
    dropIndex: number;
  } | null = null;

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

      /* Cap width for execute_actions nodes */
      .node.execute-actions {
        max-width: 200px;
      }

      .node .action:last-child {
        border-bottom-left-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
      }

      .node .action:first-child {
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
      }

      .node.dragging {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
        transform: scale(1.02);
        z-index: 1000;
      }

      .action {
        position: relative;
      }


      .action .cn-title:hover .remove-button,
      .router:hover .remove-button {
        opacity: 0.7;
      }

      .action.removing .cn-title,
      .router .cn-title.removing {
        background-color: var(--color-error, #dc3545) !important;
      }

      .action.removing .cn-title .name,
      .router .cn-title.removing .name {
        color: white;
      }

      .remove-button {
        background: transparent;
        color: white;
        opacity: 0;
        cursor: pointer;
        font-size: 1em;
        font-weight: 600;
        line-height: 1;
        z-index: 10;
        transition: all 100ms ease-in-out;
        align-self: center;
        padding:0.25em;
        border: 0px solid red;
        width: 1em;
        pointer-events: auto; /* Ensure remove button can receive events */
      }

      .remove-button:hover {
        opacity: 1;
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
        padding: 0.75em;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        white-space: normal;
        overflow: hidden;
      }

      .node.execute-actions temba-sortable-list .action:last-child .body {
        padding-bottom: 1.5em;
      }      

      .action .drag-handle {
        opacity: 0;
        transition: all 200ms ease-in-out;
        cursor: move;
        background: rgba(0, 0, 0, 0.02);
        width: 1em;
        padding: 0.25em;
        border: 0px solid red;
        pointer-events: auto; /* Ensure drag handle can receive events */
      }
      .title-spacer {
        width: 1.8em;
        
      }

      .action:hover .drag-handle {
        opacity: 0.7;
        
        
      }

      strong {
        font-weight: 500;
      }

      .action .drag-handle:hover {
        opacity: 1;
        
      }

      .action .cn-title,
      .router .cn-title {
        display: flex;
        color: #fff;
        text-align: center;
        font-size: 1em;
        font-weight: 500;
      }

      .cn-title .name {
      padding: 0.3em 0;

      }

      .router .cn-title {

      }

      .cn-title .name {
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
        padding-bottom: 0.7em;
        margin-top: -0.7em;
      }

      .category .cn-title {
        font-weight: normal;
        font-size: 1em;
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .router .body {
        padding: 0.75em;
      }

      .result-name {
        font-weight: 500;
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

      .router .cn-title {
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
      }

      .action{
        overflow: hidden;
      }

      .action:first-child .cn-title {
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
      }

      /* Add action button */
      .add-action-button {
        position: absolute;
        bottom: 0.5em;
        right: 0.5em;
        width: 1.5em;
        height: 1.5em;
        border-radius: 50%;
        background: var(--color-primary, #3b82f6);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 200ms ease-in-out;
        z-index: 10;
        pointer-events: auto;
        font-size: 0.9em;
      }

      .node.execute-actions:hover .add-action-button {
        opacity: 0.8;
      }

      .add-action-button:hover {
        opacity: 1 !important;
        transform: scale(1.1);
      }
  }`;
  }

  constructor() {
    super();
    this.handleActionOrderChanged = this.handleActionOrderChanged.bind(this);
    this.handleActionDragExternal = this.handleActionDragExternal.bind(this);
    this.handleActionDragInternal = this.handleActionDragInternal.bind(this);
    this.handleActionDragStop = this.handleActionDragStop.bind(this);
    this.handleExternalActionDragOver =
      this.handleExternalActionDragOver.bind(this);
    this.handleExternalActionDrop = this.handleExternalActionDrop.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    // Listen for external action drag events from Editor
    this.addEventListener(
      'action-drag-over',
      this.handleExternalActionDragOver as EventListener
    );
    this.addEventListener(
      'action-drop',
      this.handleExternalActionDrop as EventListener
    );
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('node')) {
      // Only proceed if plumber is available (for tests that don't set it up)
      if (this.plumber) {
        this.plumber.removeNodeConnections(this.node.uuid);
        // make our initial connections
        for (const exit of this.node.exits) {
          if (!exit.destination_uuid) {
            // if we have no destination, then we are a source
            // so make our source endpoint
            this.plumber.makeSource(exit.uuid);
          } else {
            this.plumber.connectIds(
              this.node.uuid,
              exit.uuid,
              exit.destination_uuid
            );
          }
        }

        this.plumber.revalidate([this.node.uuid]);
      }

      const ele = this.parentElement;
      if (ele) {
        const rect = ele.getBoundingClientRect();

        getStore()
          ?.getState()
          .expandCanvas(
            this.ui.position.left + rect.width,
            this.ui.position.top + rect.height
          );
      }
    }
  }

  disconnectedCallback() {
    // Remove the event listener when the component is removed
    super.disconnectedCallback();

    // Remove external drag event listeners
    this.removeEventListener(
      'action-drag-over',
      this.handleExternalActionDragOver as EventListener
    );
    this.removeEventListener(
      'action-drop',
      this.handleExternalActionDrop as EventListener
    );

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

  private handleNodeRemoveClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const nodeId = this.node.uuid;

    // If the node is already in removing state, perform the removal
    if (this.actionRemovingState.has(nodeId)) {
      this.removeNode();
      return;
    }

    // Start removal UI state
    this.actionRemovingState.add(nodeId);
    this.requestUpdate();

    // Clear any existing timeout for this node
    if (this.actionRemovalTimeouts.has(nodeId)) {
      clearTimeout(this.actionRemovalTimeouts.get(nodeId));
    }

    // Set timeout to reset UI if user doesn't click
    const timeoutId = window.setTimeout(() => {
      this.actionRemovingState.delete(nodeId);
      this.actionRemovalTimeouts.delete(nodeId);
      this.requestUpdate();
    }, 1000); // 1 second as per requirements

    this.actionRemovalTimeouts.set(nodeId, timeoutId);
  }

  private removeNode() {
    const nodeId = this.node.uuid;

    // Clear the UI state
    this.actionRemovingState.delete(nodeId);

    // Clear any timeout
    if (this.actionRemovalTimeouts.has(nodeId)) {
      clearTimeout(this.actionRemovalTimeouts.get(nodeId));
      this.actionRemovalTimeouts.delete(nodeId);
    }

    // Fire the node deleted event
    this.fireCustomEvent(CustomEventType.NodeDeleted, {
      uuid: this.node.uuid
    });
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

  private handleActionDragExternal(event: CustomEvent) {
    // stop propagation of the original event from SortableList
    event.stopPropagation();

    // get the action being dragged
    const actionId = event.detail.id;
    const splitId = actionId.split('-');
    if (splitId.length < 2 || isNaN(parseInt(splitId[1], 10))) {
      // invalid format, do not proceed
      return;
    }
    const actionIndex = parseInt(splitId[1], 10);
    const action = this.node.actions[actionIndex];

    // fire event to editor to show canvas drop preview
    this.fireCustomEvent(CustomEventType.DragExternal, {
      action,
      nodeUuid: this.node.uuid,
      actionIndex,
      mouseX: event.detail.mouseX,
      mouseY: event.detail.mouseY
    });
  }

  private handleActionDragInternal(_event: CustomEvent) {
    // stop propagation of the original event from SortableList
    _event.stopPropagation();

    // fire event to editor to hide canvas drop preview
    this.fireCustomEvent(CustomEventType.DragInternal, {});
  }

  private handleActionDragStop(event: CustomEvent) {
    const isExternal = event.detail.isExternal;

    if (isExternal) {
      // stop propagation of the original event from SortableList
      event.stopPropagation();

      // get the action being dragged
      const actionId = event.detail.id;
      const split = actionId.split('-');
      if (split.length < 2 || isNaN(Number(split[1]))) {
        // invalid actionId format, do not proceed
        return;
      }
      const actionIndex = parseInt(split[1], 10);
      const action = this.node.actions[actionIndex];

      // fire event to editor to create new node
      this.fireCustomEvent(CustomEventType.DragStop, {
        action,
        nodeUuid: this.node.uuid,
        actionIndex,
        isExternal: true,
        mouseX: event.detail.mouseX,
        mouseY: event.detail.mouseY
      });
    }
  }

  private handleActionMouseDown(event: MouseEvent, action: Action): void {
    // Don't handle clicks on the remove button, drag handle, or when action is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      target.closest('.drag-handle') ||
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

    // Don't handle clicks on the remove button, drag handle, or when action is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      target.closest('.drag-handle') ||
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

  private handleNodeEditClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Don't handle clicks on the remove button or when node is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      this.actionRemovingState.has(this.node.uuid)
    ) {
      return;
    }

    // Fire node edit requested event if the node has a router
    if (this.node.router) {
      // If router node has exactly one action, open the action editor directly
      if (this.node.actions && this.node.actions.length === 1) {
        this.fireCustomEvent(CustomEventType.ActionEditRequested, {
          action: this.node.actions[0],
          nodeUuid: this.node.uuid
        });
      } else {
        // Otherwise open the node editor as before
        this.fireCustomEvent(CustomEventType.NodeEditRequested, {
          node: this.node,
          nodeUI: this.ui
        });
      }
    }
  }

  private handleNodeMouseDown(event: MouseEvent): void {
    // Don't handle clicks on the remove button, exits, drag handle, or when node is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      target.closest('.exit') ||
      target.closest('.exit-wrapper') ||
      target.closest('.drag-handle') ||
      this.actionRemovingState.has(this.node.uuid)
    ) {
      return;
    }

    // Store the starting position for later comparison
    // Don't prevent default - let the Editor's drag system work normally
    this.nodeClickStartPos = { x: event.clientX, y: event.clientY };
    this.pendingNodeClick = { event };
  }

  private handleNodeMouseUp(event: MouseEvent): void {
    // Don't handle if we don't have a pending click
    if (!this.pendingNodeClick) {
      this.nodeClickStartPos = null;
      this.pendingNodeClick = null;
      return;
    }

    // Don't handle clicks on the remove button, exits, drag handle, or when node is in removing state
    const target = event.target as HTMLElement;
    if (
      target.closest('.remove-button') ||
      target.closest('.exit') ||
      target.closest('.exit-wrapper') ||
      target.closest('.drag-handle') ||
      this.actionRemovingState.has(this.node.uuid)
    ) {
      this.nodeClickStartPos = null;
      this.pendingNodeClick = null;
      return;
    }

    // Check if the mouse moved beyond the drag threshold
    if (this.nodeClickStartPos) {
      const deltaX = event.clientX - this.nodeClickStartPos.x;
      const deltaY = event.clientY - this.nodeClickStartPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Check if the Editor is currently in dragging mode
      const editor = this.closest('temba-flow-editor') as any;
      const editorWasDragging = editor?.dragging;

      // Only fire the node edit event if we haven't dragged beyond the threshold
      // AND either there's no Editor parent (test case) or the Editor didn't drag the node
      if (distance <= 5 && (!editor || !editorWasDragging)) {
        // Using literal 5 instead of DRAG_THRESHOLD since it's not imported
        // Fire event to request node editing if the node has a router
        if (this.node.router) {
          // If router node has exactly one action, open the action editor directly
          if (this.node.actions && this.node.actions.length === 1) {
            this.fireCustomEvent(CustomEventType.ActionEditRequested, {
              action: this.node.actions[0],
              nodeUuid: this.node.uuid
            });
          } else {
            // Otherwise open the node editor as before
            this.fireCustomEvent(CustomEventType.NodeEditRequested, {
              node: this.node,
              nodeUI: this.ui
            });
          }
        }
      }
    }

    // Clean up
    this.nodeClickStartPos = null;
    this.pendingNodeClick = null;
  }

  private handleAddActionClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Fire event to request adding a new action to this node
    this.fireCustomEvent(CustomEventType.AddActionRequested, {
      nodeUuid: this.node.uuid
    });
  }

  private calculateDropIndex(mouseY: number): number {
    // Get the sortable list element
    const sortableList = this.querySelector('temba-sortable-list');
    if (!sortableList || !this.node.actions)
      return this.node.actions?.length ?? 0;

    // Get all action elements
    const actionElements = Array.from(
      sortableList.querySelectorAll('.action.sortable')
    );

    if (actionElements.length === 0) {
      return 0;
    }

    // Find where to insert based on mouse Y position
    for (let i = 0; i < actionElements.length; i++) {
      const actionElement = actionElements[i] as HTMLElement;
      const rect = actionElement.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;

      if (mouseY < centerY) {
        return i;
      }
    }

    // If past all elements, insert at the end
    return actionElements.length;
  }

  private handleExternalActionDragOver(event: CustomEvent): void {
    // Only handle if this is an execute_actions node
    if (this.ui.type !== 'execute_actions') return;

    const { action, sourceNodeUuid, actionIndex, mouseY } = event.detail;

    // Don't accept drops from the same node
    if (sourceNodeUuid === this.node.uuid) return;

    // Calculate where to drop
    const dropIndex = this.calculateDropIndex(mouseY);

    // Store the drag info
    this.externalDragInfo = {
      action,
      sourceNodeUuid,
      actionIndex,
      dropIndex
    };

    // Request update to show placeholder
    this.requestUpdate();
  }

  private handleExternalActionDrop(event: CustomEvent): void {
    // Only handle if this is an execute_actions node
    if (this.ui.type !== 'execute_actions') return;

    const { action, sourceNodeUuid, actionIndex } = event.detail;

    // Don't accept drops from the same node
    if (sourceNodeUuid === this.node.uuid) return;

    // Get the drop index from our tracking state
    const dropIndex =
      this.externalDragInfo?.dropIndex ?? this.node.actions?.length ?? 0;

    // Clear external drag state
    this.externalDragInfo = null;

    // Remove the action from the source node
    const store = getStore();
    if (!store) return;

    const flowDefinition = store.getState().flowDefinition;
    if (!flowDefinition) return;

    const sourceNode = flowDefinition.nodes.find(
      (n) => n.uuid === sourceNodeUuid
    );

    if (sourceNode) {
      const updatedSourceActions = sourceNode.actions.filter(
        (_a, idx) => idx !== actionIndex
      );

      // If source node has no actions left, remove it
      if (updatedSourceActions.length === 0) {
        this.fireCustomEvent(CustomEventType.NodeDeleted, {
          uuid: sourceNodeUuid
        });
      } else {
        // Update source node
        const updatedSourceNode = {
          ...sourceNode,
          actions: updatedSourceActions
        };
        getStore()?.getState().updateNode(sourceNodeUuid, updatedSourceNode);
      }
    }

    // Add the action to this node at the calculated position
    const newActions = [...this.node.actions];
    newActions.splice(dropIndex, 0, action);

    const updatedNode = { ...this.node, actions: newActions };
    getStore()?.getState().updateNode(this.node.uuid, updatedNode);

    // Request update
    this.requestUpdate();
  }

  private renderTitle(
    config: ActionConfig,
    action: Action,
    index: number,
    isRemoving: boolean = false
  ) {
    const color = config.group
      ? ACTION_GROUP_METADATA[config.group]?.color
      : '#aaaaaa';
    return html`<div class="cn-title" style="background:${color}">
      ${this.node?.actions?.length > 1
        ? html`<temba-icon class="drag-handle" name="sort"></temba-icon>`
        : html`<div class="title-spacer"></div>`}

      <div class="name">${isRemoving ? 'Remove?' : config.name}</div>
      <div
        class="remove-button"
        @click=${(e: MouseEvent) =>
          this.handleActionRemoveClick(e, action, index)}
        title="Remove action"
      >
        ✕
      </div>
    </div>`;
  }

  private renderNodeTitle(
    config: NodeConfig,
    node: Node,
    ui: NodeUI,
    isRemoving: boolean = false
  ) {
    // Get color from the appropriate metadata (either ACTION or SPLIT)
    const color = config.group
      ? ACTION_GROUP_METADATA[config.group]?.color ||
        SPLIT_GROUP_METADATA[config.group]?.color
      : '#aaaaaa';
    return html`<div
      class="cn-title ${isRemoving ? 'removing' : ''}"
      style="background:${color}"
    >
      <div class="title-spacer"></div>
      <div class="name">
        ${isRemoving
          ? 'Remove?'
          : config.renderTitle
          ? config.renderTitle(node, ui)
          : html`${config.name}`}
      </div>
      <div
        class="remove-button"
        @click=${(e: MouseEvent) => this.handleNodeRemoveClick(e)}
        title="Remove node"
      >
        ✕
      </div>
    </div>`;
  }

  private renderDropPlaceholder() {
    return html`<div
      class="action sortable drop-placeholder"
      style="min-height: 60px; background: rgba(var(--color-primary-rgb), 0.1); border: 2px dashed rgba(var(--color-primary-rgb), 0.3); border-radius: var(--curvature);"
    ></div>`;
  }

  private renderAction(node: Node, action: Action, index: number) {
    const config = ACTION_CONFIG[action.type];
    const isRemoving = this.actionRemovingState.has(action.uuid);

    if (config) {
      return html`<div
        class="action sortable ${action.type} ${isRemoving ? 'removing' : ''}"
        id="action-${index}"
      >
        <div
          class="action-content"
          @mousedown=${(e: MouseEvent) => this.handleActionMouseDown(e, action)}
          @mouseup=${(e: MouseEvent) => this.handleActionMouseUp(e, action)}
          style="cursor: pointer; background: #fff"
        >
          ${this.renderTitle(config, action, index, isRemoving)}
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
      <div
        class="remove-button"
        @click=${(e: MouseEvent) =>
          this.handleActionRemoveClick(e, action, index)}
        title="Remove action"
      >
        ✕
      </div>
      ${action.type}
    </div>`;
  }

  private renderActionsWithPlaceholder() {
    if (!this.externalDragInfo) {
      // No external drag, render normally
      return this.node.actions.map((action, index) =>
        this.renderAction(this.node, action, index)
      );
    }

    // Insert placeholder at the drop index
    const result = [];
    for (let i = 0; i < this.node.actions.length; i++) {
      if (i === this.externalDragInfo.dropIndex) {
        result.push(this.renderDropPlaceholder());
      }
      result.push(this.renderAction(this.node, this.node.actions[i], i));
    }

    // If dropping at the end, add placeholder after all actions
    if (this.externalDragInfo.dropIndex >= this.node.actions.length) {
      result.push(this.renderDropPlaceholder());
    }

    return result;
  }

  private renderRouter(router: Router, ui: NodeUI) {
    const nodeConfig = NODE_CONFIG[ui.type];
    if (nodeConfig) {
      return html`<div class="router" style="position: relative;">
        ${router.result_name
          ? html`<div
              class="body"
              @mousedown=${(e: MouseEvent) => this.handleNodeMouseDown(e)}
              @mouseup=${(e: MouseEvent) => this.handleNodeMouseUp(e)}
              style="cursor: pointer;"
            >
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

    return html`<div class="categories">
      ${repeat(
        node.router.categories,
        (category) => category.uuid,
        (category) => {
          const exit = node.exits.find(
            (exit: Exit) => exit.uuid == category.exit_uuid
          );

          return html`<div
            class="category"
            @mousedown=${(e: MouseEvent) => this.handleNodeMouseDown(e)}
            @mouseup=${(e: MouseEvent) => this.handleNodeMouseUp(e)}
            style="cursor: pointer;"
          >
            <div class="cn-title">${category.name}</div>
            ${this.renderExit(exit)}
          </div>`;
        }
      )}
    </div>`;
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

    const nodeConfig = NODE_CONFIG[this.ui.type];

    return html`
      <div
        id="${this.node.uuid}"
        class="node ${this.ui.type === 'execute_actions'
          ? 'execute-actions'
          : ''}"
        style="left:${this.ui.position.left}px;top:${this.ui.position.top}px"
      >
        ${nodeConfig && nodeConfig.type !== 'execute_actions'
          ? html`<div class="router" style="position: relative;">
              <div
                @mousedown=${(e: MouseEvent) => this.handleNodeMouseDown(e)}
                @mouseup=${(e: MouseEvent) => this.handleNodeMouseUp(e)}
                style="cursor: pointer;"
              >
                ${this.renderNodeTitle(
                  nodeConfig,
                  this.node,
                  this.ui,
                  this.actionRemovingState.has(this.node.uuid)
                )}
                ${nodeConfig.render
                  ? nodeConfig.render(this.node, this.ui)
                  : null}
              </div>
            </div>`
          : this.node.actions.length > 0
          ? this.ui.type === 'execute_actions'
            ? html`<temba-sortable-list
                dragHandle="drag-handle"
                externalDrag
                @temba-order-changed="${this.handleActionOrderChanged}"
                @temba-drag-external="${this.handleActionDragExternal}"
                @temba-drag-internal="${this.handleActionDragInternal}"
                @temba-drag-stop="${this.handleActionDragStop}"
              >
                ${this.renderActionsWithPlaceholder()}
              </temba-sortable-list>`
            : html`${this.node.actions.map((action, index) =>
                this.renderAction(this.node, action, index)
              )}`
          : ''}
        ${this.node.router
          ? html` ${this.renderRouter(this.node.router, this.ui)}
            ${this.renderCategories(this.node)}`
          : html`<div class="action-exits">
              ${repeat(
                this.node.exits,
                (exit) => exit.uuid,
                (exit) => this.renderExit(exit)
              )}
            </div>`}
        ${this.ui.type === 'execute_actions'
          ? html`<div
              class="add-action-button"
              @click=${(e: MouseEvent) => this.handleAddActionClick(e)}
              title="Add action"
            >
              <temba-icon name="add"></temba-icon>
            </div>`
          : ''}
      </div>
    `;
  }
}
