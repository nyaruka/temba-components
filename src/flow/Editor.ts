import { html, TemplateResult } from 'lit-html';
import { css, PropertyValueMap, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import {
  FlowDefinition,
  FlowPosition,
  Action,
  Node,
  NodeUI
} from '../store/flow-definition';
import { getStore } from '../store/Store';
import { AppState, fromStore, zustand } from '../store/AppState';
import { RapidElement } from '../RapidElement';
import { repeat } from 'lit-html/directives/repeat.js';
import { CustomEventType } from '../interfaces';
import { generateUUID } from '../utils';
import { ACTION_CONFIG, NODE_CONFIG } from './config';
import { ACTION_GROUP_METADATA } from './types';

import { Plumber } from './Plumber';
import { CanvasNode } from './CanvasNode';
import { Dialog } from '../layout/Dialog';
import { Connection } from '@jsplumb/browser-ui';
import { CanvasMenu, CanvasMenuSelection } from './CanvasMenu';
import { NodeTypeSelector, NodeTypeSelection } from './NodeTypeSelector';

export function snapToGrid(value: number): number {
  const snapped = Math.round(value / 20) * 20;
  return Math.max(snapped, 0);
}

export function findNodeForExit(
  definition: FlowDefinition,
  exitUuid: string
): string | null {
  for (const node of definition.nodes) {
    const exit = node.exits.find((e) => e.uuid === exitUuid);
    if (exit) {
      return node.uuid;
    }
  }
  return null;
}

const SAVE_QUIET_TIME = 500;

export interface DraggableItem {
  uuid: string;
  position: FlowPosition;
  element: HTMLElement;
  type: 'node' | 'sticky';
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DRAG_THRESHOLD = 5;

// Offset for positioning dropped action node relative to mouse cursor
// Keep small to make drop location close to cursor position
const DROP_PREVIEW_OFFSET_X = 20;
const DROP_PREVIEW_OFFSET_Y = 20;

export class Editor extends RapidElement {
  // unfortunately, jsplumb requires that we be in light DOM
  createRenderRoot() {
    return this;
  }

  // this is the master plumber
  private plumber: Plumber;

  // timer for debounced saving
  private saveTimer: number | null = null;

  @property({ type: String })
  public flow: string;

  @property({ type: String })
  public version: string;

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private definition!: FlowDefinition;

  @fromStore(zustand, (state: AppState) => state.canvasSize)
  private canvasSize!: { width: number; height: number };

  @fromStore(zustand, (state: AppState) => state.dirtyDate)
  private dirtyDate!: Date;

  @fromStore(zustand, (state: AppState) => state.languageCode)
  private languageCode!: string;

  @fromStore(zustand, (state: AppState) => state.isTranslating)
  private isTranslating!: boolean;

  // Drag state
  @state()
  private isDragging = false;
  private isMouseDown = false;
  private dragStartPos = { x: 0, y: 0 };

  // Public getter for drag state
  public get dragging(): boolean {
    return this.isDragging;
  }

  @state()
  private currentDragItem: DraggableItem | null = null;
  private startPos = { left: 0, top: 0 };

  // Selection state
  @state()
  private selectedItems: Set<string> = new Set();

  @state()
  private isSelecting = false;

  @state()
  private selectionBox: SelectionBox | null = null;

  @state()
  private targetId: string | null = null;

  @state()
  private sourceId: string | null = null;

  @state()
  private dragFromNodeId: string | null = null;

  @state()
  private isValidTarget = true;

  // NodeEditor state - handles both node and action editing
  @state()
  private editingNode: Node | null = null;

  @state()
  private editingNodeUI: NodeUI | null = null;

  @state()
  private editingAction: Action | null = null;

  @state()
  private isCreatingNewNode = false;

  @state()
  private pendingNodePosition: FlowPosition | null = null;

  // Canvas drop state for dragging actions to canvas
  @state()
  private canvasDropPreview: {
    action: Action;
    nodeUuid: string;
    actionIndex: number;
    position: FlowPosition;
    actionHeight: number;
  } | null = null;
  @state()
  private addActionToNodeUuid: string | null = null;

  // Track target node for action drag
  @state()
  private actionDragTargetNodeUuid: string | null = null;

  // Track previous target node to clear placeholder when moving between nodes
  private previousActionDragTargetNodeUuid: string | null = null;

  private canvasMouseDown = false;

  // Available languages for localization
  private readonly AVAILABLE_LANGUAGES = [
    { code: 'eng', name: 'English' },
    { code: 'fra', name: 'French' },
    { code: 'esp', name: 'Spanish' }
  ];

  // Bound event handlers to maintain proper 'this' context
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundGlobalMouseDown = this.handleGlobalMouseDown.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);
  private boundCanvasContextMenu = this.handleCanvasContextMenu.bind(this);

  static get styles() {
    return css`
      #editor {
        overflow: scroll;
        flex: 1;
        -webkit-font-smoothing: antialiased;
      }

      #grid {
        position: relative;
        background-color: #f9f9f9;
        background-image: radial-gradient(
          circle,
          rgba(61, 177, 255, 0.3) 1px,
          transparent 1px
        );
        background-size: 20px 20px;
        background-position: 10px 10px;
        box-shadow: inset -5px 0 10px rgba(0, 0, 0, 0.05);
        border-top: 1px solid #e0e0e0;
        width: 100%;
        display: flex;
      }

      #canvas {
        position: relative;
        padding: 0px;
        flex-grow: 1;
        margin: 20px;
      }

      #canvas > .draggable {
        position: absolute;
        z-index: 100;
      }

      #canvas > .dragging {
        z-index: 99999 !important;
      }

      body .jtk-endpoint {
        width: initial;
        height: initial;
      }

      .jtk-endpoint {
        z-index: 600;
        opacity: 0;
      }

      .plumb-source {
        z-index: 600;
        cursor: pointer;
        opacity: 0;
      }

      .plumb-source.connected {
        border-radius: 50%;
        pointer-events: none;
      }

      .plumb-source circle {
        fill: purple;
      }

      .plumb-target {
        z-index: 600;
        opacity: 0;
        cursor: pointer;
        fill: transparent;
      }

      body svg.jtk-connector.plumb-connector path {
        stroke: var(--color-connectors) !important;
        stroke-width: 3px;
      }

      body .plumb-connector {
        z-index: 10 !important;
      }

      body .plumb-connector .plumb-arrow {
        fill: var(--color-connectors);
        stroke: var(--color-connectors);
        stroke-width: 0px !important;
        margin-top: 6px;
        z-index: 10;
      }

      body svg.jtk-connector.jtk-hover path {
        stroke: var(--color-success) !important;
        stroke-width: 3px;
      }

      body .plumb-connector.jtk-hover .plumb-arrow {
        fill: var(--color-success) !important;
        stroke-width: 0px;
        z-index: 10;
      }

      /* Connection dragging feedback */
      body svg.jtk-connector.jtk-dragging {
        z-index: 99999 !important;
      }

      .katavorio-drag-no-select svg.jtk-connector path,
      .katavorio-drag-no-select svg.jtk-endpoint path {
        pointer-events: none !important;
        border: 1px solid purple;
      }

      /* Connection target feedback */
      temba-flow-node.connection-target-valid {
        outline: 3px solid var(--color-success, #22c55e) !important;
        outline-offset: 2px;
        border-radius: var(--curvature);
      }

      temba-flow-node.connection-target-invalid {
        outline: 3px solid var(--color-error, #ef4444) !important;
        outline-offset: 2px;
        border-radius: var(--curvature);
      }

      /* Selection box styles */
      .selection-box {
        position: absolute;
        border: 2px dashed #6298f0ff;
        background-color: rgba(59, 130, 246, 0.1);
        z-index: 9999;
        pointer-events: none;
      }

      /* Selected item styles */
      .draggable.selected {
        outline: 3px solid #6298f0ff;
        outline-offset: 0px;
        border-radius: var(--curvature);
      }

      .jtk-floating-endpoint {
        pointer-events: none;
      }

      /* Language selector toolbar */
      #language-toolbar {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        background: white;
        border-bottom: 1px solid #e0e0e0;
        gap: 8px;
        font-size: 13px;
      }

      #language-toolbar label {
        font-weight: 500;
        color: #666;
      }

      .language-selector {
        display: flex;
        gap: 4px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        overflow: hidden;
      }

      .language-button {
        padding: 4px 12px;
        background: white;
        border: none;
        cursor: pointer;
        font-size: 13px;
        color: #666;
        transition: all 0.2s;
      }

      .language-button:hover {
        background: #f5f5f5;
      }

      .language-button.active {
        background: var(--color-primary, #3498db);
        color: white;
        font-weight: 500;
      }

      .language-button.translating {
        background: #ffa500;
        color: white;
        font-weight: 500;
      }
    `;
  }

  constructor() {
    super();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    this.plumber = new Plumber(this.querySelector('#canvas'));
    this.setupGlobalEventListeners();
    if (changes.has('flow')) {
      getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
    }

    this.plumber.on('connection:drag', (info: Connection) => {
      this.dragFromNodeId = document
        .getElementById(info.sourceId)
        .closest('.node').id;
      this.sourceId = info.sourceId;
    });

    this.plumber.on('connection:abort', () => {
      this.makeConnection();
    });

    this.plumber.on('connection:detach', () => {
      this.makeConnection();
    });
  }

  private makeConnection() {
    if (this.sourceId && this.targetId && this.isValidTarget) {
      this.plumber.connectIds(
        this.dragFromNodeId,
        this.sourceId,
        this.targetId
      );
      getStore()
        .getState()
        .updateConnection(this.dragFromNodeId, this.sourceId, this.targetId);

      setTimeout(() => {
        this.plumber.repaintEverything();
      }, 100);
    }

    // Clean up visual feedback
    document.querySelectorAll('temba-flow-node').forEach((node) => {
      node.classList.remove(
        'connection-target-valid',
        'connection-target-invalid'
      );
    });

    this.sourceId = null;
    this.targetId = null;
    this.dragFromNodeId = null;
    this.isValidTarget = true;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('canvasSize')) {
      // console.log('Setting canvas size', this.canvasSize);
    }

    if (changes.has('definition')) {
      this.updateCanvasSize();
    }

    if (changes.has('dirtyDate')) {
      if (this.dirtyDate) {
        this.debouncedSave();
      }
    }
  }

  private debouncedSave(): void {
    // Clear any existing timer
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(() => {
      const now = new Date();
      const timeSinceLastChange = now.getTime() - this.dirtyDate.getTime();

      if (timeSinceLastChange >= SAVE_QUIET_TIME) {
        this.saveChanges();
        this.saveTimer = null;
      } else {
        this.debouncedSave();
      }
    }, SAVE_QUIET_TIME);
  }

  private saveChanges(): void {
    // post the flow definition to the server
    getStore()
      .postJSON(`/flow/revisions/${this.flow}`, this.definition)
      .then((response) => {
        // Update flow info with the response data
        if (response.json && response.json.info) {
          getStore().getState().setFlowInfo(response.json.info);
        }
      })
      .catch((error) => {
        console.error('Failed to save flow:', error);
      });

    getStore().getState().setDirtyDate(null);
  }

  private handleLanguageChange(languageCode: string): void {
    zustand.getState().setLanguageCode(languageCode);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('mousedown', this.boundGlobalMouseDown);
    document.removeEventListener('keydown', this.boundKeyDown);

    const canvas = this.querySelector('#canvas');
    if (canvas) {
      canvas.removeEventListener('contextmenu', this.boundCanvasContextMenu);
    }
  }

  private setupGlobalEventListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('mousedown', this.boundGlobalMouseDown);
    document.addEventListener('keydown', this.boundKeyDown);

    const canvas = this.querySelector('#canvas');
    if (canvas) {
      canvas.addEventListener('contextmenu', this.boundCanvasContextMenu);
    }

    // Listen for action edit requests from flow nodes
    this.addEventListener(
      CustomEventType.ActionEditRequested,
      this.handleActionEditRequested.bind(this)
    );

    // Listen for add action requests from flow nodes
    this.addEventListener(
      CustomEventType.AddActionRequested,
      this.handleAddActionRequested.bind(this)
    );

    // Listen for node edit requests from flow nodes
    this.addEventListener(
      CustomEventType.NodeEditRequested,
      this.handleNodeEditRequested.bind(this)
    );

    // Listen for canvas menu selections
    this.addEventListener(CustomEventType.Selection, (event: CustomEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'TEMBA-CANVAS-MENU') {
        this.handleCanvasMenuSelection(event);
      } else if (target.tagName === 'TEMBA-NODE-TYPE-SELECTOR') {
        this.handleNodeTypeSelection(event);
      }
    });

    // Listen for action drag events from nodes
    this.addEventListener(
      CustomEventType.DragExternal,
      this.handleActionDragExternal.bind(this)
    );

    this.addEventListener(
      CustomEventType.DragInternal,
      this.handleActionDragInternal.bind(this)
    );

    this.addEventListener(CustomEventType.DragStop, (event: CustomEvent) => {
      if (event.detail.isExternal) {
        this.handleActionDropExternal(event);
      }
    });
  }

  private getPosition(uuid: string, type: 'node' | 'sticky'): FlowPosition {
    if (type === 'node') {
      return this.definition._ui.nodes[uuid]?.position;
    } else {
      return this.definition._ui.stickies?.[uuid]?.position;
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    // ignore right clicks
    if (event.button !== 0) return;

    const element = event.currentTarget as HTMLElement;
    // Only start dragging if clicking on the element itself, not on exits or other interactive elements
    const target = event.target as HTMLElement;
    if (target.classList.contains('exit') || target.closest('.exit')) {
      return;
    }

    const uuid = element.getAttribute('uuid');
    const type = element.tagName === 'TEMBA-FLOW-NODE' ? 'node' : 'sticky';

    const position = this.getPosition(uuid, type);
    if (!position) return;

    // If clicking on a non-selected item, clear selection unless Ctrl/Cmd is held
    if (!this.selectedItems.has(uuid) && !event.ctrlKey && !event.metaKey) {
      this.selectedItems.clear();
      // Don't add single items to selection - single clicks just clear existing selection
    } else if (!this.selectedItems.has(uuid)) {
      // Add this item to selection only if Ctrl/Cmd is held
      this.selectedItems.add(uuid);
    }

    // Always set up drag state regardless of selection status
    // This allows single nodes to be dragged without being selected
    this.isMouseDown = true;
    this.dragStartPos = { x: event.clientX, y: event.clientY };
    this.startPos = { left: position.left, top: position.top };
    this.currentDragItem = {
      uuid,
      position,
      element,
      type
    };

    event.preventDefault();
    event.stopPropagation();
  }

  private handleGlobalMouseDown(event: MouseEvent): void {
    // ignore right clicks
    if (event.button !== 0) return;

    // Check if the click is within our canvas
    const canvasRect = this.querySelector('#grid')?.getBoundingClientRect();

    if (!canvasRect) return;

    const isWithinCanvas =
      event.clientX >= canvasRect.left &&
      event.clientX <= canvasRect.right &&
      event.clientY >= canvasRect.top &&
      event.clientY <= canvasRect.bottom;

    if (!isWithinCanvas) return;

    // Check if we clicked on a draggable item (node or sticky)
    const target = event.target as HTMLElement;
    const clickedOnDraggable = target.closest('.draggable');

    if (clickedOnDraggable) {
      // This is handled by the individual item mousedown handlers
      return;
    }

    // We clicked on empty canvas space, start selection
    this.handleCanvasMouseDown(event);
  }

  private handleCanvasMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.id === 'canvas' || target.id === 'grid') {
      // Ignore clicks on exits

      // Start selection box
      this.canvasMouseDown = true;
      this.dragStartPos = { x: event.clientX, y: event.clientY };

      const canvasRect = this.querySelector('#canvas')?.getBoundingClientRect();
      if (canvasRect) {
        // Clear current selection
        this.selectedItems.clear();

        const relativeX = event.clientX - canvasRect.left;
        const relativeY = event.clientY - canvasRect.top;

        this.selectionBox = {
          startX: relativeX,
          startY: relativeY,
          endX: relativeX,
          endY: relativeY
        };
      }

      event.preventDefault();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedItems.size > 0) {
        this.showDeleteConfirmation();
      }
    }
    if (event.key === 'Escape') {
      this.selectedItems.clear();
      this.requestUpdate();
    }
  }

  private showDeleteConfirmation(): void {
    const itemCount = this.selectedItems.size;
    const itemType = itemCount === 1 ? 'item' : 'items';

    // Create and show confirmation dialog
    const dialog = document.createElement('temba-dialog') as Dialog;
    dialog.header = 'Delete Items';
    dialog.primaryButtonName = 'Delete';
    dialog.cancelButtonName = 'Cancel';
    dialog.destructive = true;
    dialog.innerHTML = `<div style="padding: 20px;">Are you sure you want to delete ${itemCount} ${itemType}?</div>`;

    dialog.addEventListener('temba-button-clicked', (event: any) => {
      if (event.detail.button.name === 'Delete') {
        this.deleteSelectedItems();
        dialog.open = false;
      }
    });

    // Add to document and show
    document.body.appendChild(dialog);
    dialog.open = true;

    // Clean up dialog when closed
    dialog.addEventListener('temba-dialog-hidden', () => {
      document.body.removeChild(dialog);
    });
  }

  private deleteNodes(uuids: string[]): void {
    // Clean up jsPlumb connections for nodes before removing them
    uuids.forEach((uuid) => {
      this.plumber.removeNodeConnections(uuid);
    });

    // Now remove them from the definition
    if (uuids.length > 0 && this.plumber) {
      getStore().getState().removeNodes(uuids);
    }
  }

  private deleteSelectedItems(): void {
    const nodes = Array.from(this.selectedItems).filter((uuid) =>
      this.definition.nodes.some((node) => node.uuid === uuid)
    );
    this.deleteNodes(Array.from(nodes));

    const stickies = Array.from(this.selectedItems).filter(
      (uuid) => this.definition._ui?.stickies?.[uuid]
    );

    getStore().getState().removeStickyNotes(stickies);

    // Clear selection
    this.selectedItems.clear();
  }

  private updateSelectionBox(event: MouseEvent): void {
    if (!this.selectionBox || !this.canvasMouseDown) return;

    const canvasRect = this.querySelector('#canvas')?.getBoundingClientRect();
    if (!canvasRect) return;

    const relativeX = event.clientX - canvasRect.left;
    const relativeY = event.clientY - canvasRect.top;

    this.selectionBox = {
      ...this.selectionBox,
      endX: relativeX,
      endY: relativeY
    };

    // Update selected items based on selection box
    this.updateSelectedItemsFromBox();
  }

  private updateSelectedItemsFromBox(): void {
    if (!this.selectionBox) return;

    const newSelection = new Set<string>();

    const boxLeft = Math.min(this.selectionBox.startX, this.selectionBox.endX);
    const boxTop = Math.min(this.selectionBox.startY, this.selectionBox.endY);
    const boxRight = Math.max(this.selectionBox.startX, this.selectionBox.endX);
    const boxBottom = Math.max(
      this.selectionBox.startY,
      this.selectionBox.endY
    );

    // Check nodes
    this.definition?.nodes.forEach((node) => {
      const nodeElement = this.querySelector(`[id="${node.uuid}"]`);
      if (nodeElement) {
        const position = this.definition._ui?.nodes[node.uuid]?.position;
        if (position) {
          const rect = nodeElement.getBoundingClientRect();
          const canvasRect =
            this.querySelector('#canvas')?.getBoundingClientRect();

          if (canvasRect) {
            const nodeLeft = position.left;
            const nodeTop = position.top;
            const nodeRight = nodeLeft + rect.width;
            const nodeBottom = nodeTop + rect.height;

            // Check if selection box intersects with node
            if (
              boxLeft < nodeRight &&
              boxRight > nodeLeft &&
              boxTop < nodeBottom &&
              boxBottom > nodeTop
            ) {
              newSelection.add(node.uuid);
            }
          }
        }
      }
    });

    // Check sticky notes
    const stickies = this.definition?._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (sticky.position) {
        const stickyElement = this.querySelector(
          `temba-sticky-note[uuid="${uuid}"]`
        ) as HTMLElement;

        if (stickyElement) {
          // Use clientWidth/clientHeight instead of getBoundingClientRect() to get element dimensions
          // This avoids the coordinate system mismatch between viewport and canvas coordinates
          const width = stickyElement.clientWidth;
          const height = stickyElement.clientHeight;

          // Use the canvas coordinates from the sticky's position
          const stickyLeft = sticky.position.left;
          const stickyTop = sticky.position.top;
          const stickyRight = stickyLeft + width;
          const stickyBottom = stickyTop + height;

          // Check if selection box intersects with sticky
          if (
            boxLeft < stickyRight &&
            boxRight > stickyLeft &&
            boxTop < stickyBottom &&
            boxBottom > stickyTop
          ) {
            newSelection.add(uuid);
          }
        }
      }
    });

    this.selectedItems = newSelection;
  }

  private renderSelectionBox(): TemplateResult | string {
    if (!this.selectionBox || !this.isSelecting) return '';

    const left = Math.min(this.selectionBox.startX, this.selectionBox.endX);
    const top = Math.min(this.selectionBox.startY, this.selectionBox.endY);
    const width = Math.abs(this.selectionBox.endX - this.selectionBox.startX);
    const height = Math.abs(this.selectionBox.endY - this.selectionBox.startY);

    return html`<div
      class="selection-box"
      style="left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;"
    ></div>`;
  }

  private renderCanvasDropPreview(): TemplateResult | string {
    if (!this.canvasDropPreview) return '';

    const { action, position } = this.canvasDropPreview;
    const actionConfig = ACTION_CONFIG[action.type];

    if (!actionConfig) return '';

    return html`<div
      class="canvas-drop-preview"
      style="position: absolute; left: ${position.left}px; top: ${position.top}px; opacity: 0.6; pointer-events: none; z-index: 10000;"
    >
      <div
        class="node execute-actions"
        style="outline: 3px dashed var(--color-primary, #3b82f6); outline-offset: 2px; border-radius: var(--curvature);"
      >
        <div class="action sortable ${action.type}">
          <div class="action-content">
            <div
              class="cn-title"
              style="background: ${actionConfig.group
                ? ACTION_GROUP_METADATA[actionConfig.group]?.color
                : '#aaaaaa'}"
            >
              <div class="title-spacer"></div>
              <div class="name">${actionConfig.name}</div>
              <div class="title-spacer"></div>
            </div>
            <div class="body">
              ${actionConfig.render
                ? actionConfig.render({ actions: [action] } as any, action)
                : html`<pre>${action.type}</pre>`}
            </div>
          </div>
        </div>
        <div class="action-exits">
          <div class="exit-wrapper">
            <div class="exit"></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  private handleMouseMove(event: MouseEvent): void {
    // Handle selection box drawing
    if (this.canvasMouseDown && !this.isMouseDown) {
      this.isSelecting = true;
      this.updateSelectionBox(event);
      this.requestUpdate(); // Force re-render
      return;
    }

    if (this.plumber.connectionDragging) {
      const targetNode = document.querySelector('temba-flow-node:hover');

      // Clear previous target styles
      document.querySelectorAll('temba-flow-node').forEach((node) => {
        node.classList.remove(
          'connection-target-valid',
          'connection-target-invalid'
        );
      });

      if (targetNode) {
        this.targetId = targetNode.getAttribute('uuid');
        // Check if target is different from source node (prevent self-targeting)
        this.isValidTarget = this.targetId !== this.dragFromNodeId;

        // Apply visual feedback based on validity
        if (this.isValidTarget) {
          targetNode.classList.add('connection-target-valid');
        } else {
          targetNode.classList.add('connection-target-invalid');
        }
      } else {
        this.targetId = null;
        this.isValidTarget = true;
      }
    }

    // Handle item dragging
    if (!this.isMouseDown || !this.currentDragItem) return;

    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only start dragging if we've moved beyond the threshold
    if (!this.isDragging && distance > DRAG_THRESHOLD) {
      this.isDragging = true;
    }

    // If we're actually dragging, update positions
    if (this.isDragging) {
      // Determine what items to move
      const itemsToMove =
        this.selectedItems.has(this.currentDragItem.uuid) &&
        this.selectedItems.size > 1
          ? Array.from(this.selectedItems)
          : [this.currentDragItem.uuid];

      itemsToMove.forEach((uuid) => {
        const element = this.querySelector(`[uuid="${uuid}"]`) as HTMLElement;
        if (element) {
          const type =
            element.tagName === 'TEMBA-FLOW-NODE' ? 'node' : 'sticky';
          const position = this.getPosition(uuid, type);

          if (position) {
            const newLeft = position.left + deltaX;
            const newTop = position.top + deltaY;

            // Update the visual position during drag
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;

            // Add dragging class to ensure highest z-index
            element.classList.add('dragging');
          }
        }
      });

      this.plumber.revalidate(itemsToMove);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    // Handle selection box completion
    if (this.canvasMouseDown && this.isSelecting) {
      this.isSelecting = false;
      this.selectionBox = null;
      this.canvasMouseDown = false;
      this.requestUpdate();
      return;
    }

    // Handle canvas click (clear selection)
    if (this.canvasMouseDown && !this.isSelecting) {
      this.canvasMouseDown = false;
      return;
    }

    // Handle item drag completion
    if (!this.isMouseDown || !this.currentDragItem) return;

    // If we were actually dragging, handle the drag end
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      // Determine what items were moved
      const itemsToMove =
        this.selectedItems.has(this.currentDragItem.uuid) &&
        this.selectedItems.size > 1
          ? Array.from(this.selectedItems)
          : [this.currentDragItem.uuid];

      // Update positions for all moved items
      const newPositions: { [uuid: string]: FlowPosition } = {};

      itemsToMove.forEach((uuid) => {
        const type = this.definition.nodes.find((node) => node.uuid === uuid)
          ? 'node'
          : 'sticky';
        const position = this.getPosition(uuid, type);

        if (position) {
          const newLeft = position.left + deltaX;
          const newTop = position.top + deltaY;

          // Snap to 20px grid for final position
          const snappedLeft = snapToGrid(newLeft);
          const snappedTop = snapToGrid(newTop);

          const newPosition = { left: snappedLeft, top: snappedTop };
          newPositions[uuid] = newPosition;

          // Remove dragging class
          const element = this.querySelector(`[uuid="${uuid}"]`) as HTMLElement;
          if (element) {
            element.classList.remove('dragging');
            element.style.left = `${snappedLeft}px`;
            element.style.top = `${snappedTop}px`;
          }
        }
      });

      if (Object.keys(newPositions).length > 0) {
        getStore().getState().updateCanvasPositions(newPositions);

        setTimeout(() => {
          this.plumber.repaintEverything();
        }, 0);
      }

      this.selectedItems.clear();
    }

    // Reset all drag state
    this.isDragging = false;
    this.isMouseDown = false;
    this.currentDragItem = null;
    this.canvasMouseDown = false;
  }

  private updateCanvasSize(): void {
    if (!this.definition) return;

    const store = getStore();
    if (!store) return;

    // Calculate required canvas size based on all elements
    let maxWidth = 0;
    let maxHeight = 0;

    // Check node positions
    this.definition.nodes.forEach((node) => {
      const ui = this.definition._ui.nodes[node.uuid];
      if (ui && ui.position) {
        const nodeElement = this.querySelector(`[id="${node.uuid}"]`);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          maxWidth = Math.max(maxWidth, ui.position.left + rect.width);
          maxHeight = Math.max(maxHeight, ui.position.top + rect.height);
        }
      }
    });

    // Check sticky note positions
    const stickies = this.definition._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (sticky.position) {
        const stickyElement = this.querySelector(
          `temba-sticky-note[uuid="${uuid}"]`
        ) as HTMLElement;
        if (stickyElement) {
          // Use clientWidth/clientHeight instead of getBoundingClientRect() to get element dimensions
          // This avoids the coordinate system mismatch between viewport and canvas coordinates
          const width = stickyElement.clientWidth;
          const height = stickyElement.clientHeight;

          // Both sticky.position and width/height are now in the same coordinate system
          maxWidth = Math.max(maxWidth, sticky.position.left + width);
          maxHeight = Math.max(maxHeight, sticky.position.top + height);
        } else {
          // Fallback to default sizes if element not found
          maxWidth = Math.max(maxWidth, sticky.position.left + 200);
          maxHeight = Math.max(maxHeight, sticky.position.top + 100);
        }
      }
    });

    // Update canvas size in store
    store.getState().expandCanvas(maxWidth, maxHeight);
  }

  private handleCanvasContextMenu(event: MouseEvent): void {
    // Check if we right-clicked on empty canvas space
    const target = event.target as HTMLElement;
    if (target.id !== 'canvas') {
      return;
    }

    // Prevent the default browser context menu
    event.preventDefault();
    event.stopPropagation();

    // Get canvas position
    const canvas = this.querySelector('#canvas');
    if (!canvas) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const relativeX = event.clientX - canvasRect.left - 10;
    const relativeY = event.clientY - canvasRect.top - 10;

    // Snap position to grid
    const snappedLeft = snapToGrid(relativeX);
    const snappedTop = snapToGrid(relativeY);

    // Show the canvas menu at the mouse position (use viewport coordinates)
    const canvasMenu = this.querySelector('temba-canvas-menu') as CanvasMenu;
    if (canvasMenu) {
      canvasMenu.show(event.clientX, event.clientY, {
        x: snappedLeft,
        y: snappedTop
      });
    }
  }

  private handleCanvasMenuSelection(event: CustomEvent): void {
    const selection = event.detail as CanvasMenuSelection;
    const store = getStore();

    if (selection.action === 'sticky') {
      // Create new sticky note
      store.getState().createStickyNote({
        left: selection.position.x,
        top: selection.position.y
      });
    } else {
      // Show node type selector
      const selector = this.querySelector(
        'temba-node-type-selector'
      ) as NodeTypeSelector;
      if (selector) {
        selector.show(selection.action, selection.position);
      }
    }
  }

  private handleNodeTypeSelection(event: CustomEvent): void {
    const selection = event.detail as NodeTypeSelection;

    // Check if we're adding an action to an existing node
    if (this.addActionToNodeUuid) {
      // Find the existing node
      const node = this.definition.nodes.find(
        (n) => n.uuid === this.addActionToNodeUuid
      );
      const nodeUI = this.definition._ui.nodes[this.addActionToNodeUuid];

      if (node && nodeUI) {
        // Create a new action to add to the existing node
        const actionUuid = generateUUID();
        this.editingAction = {
          uuid: actionUuid,
          type: selection.nodeType as any
        } as Action;

        // Set the editing node to the existing node (not creating new)
        this.editingNode = node;
        this.editingNodeUI = nodeUI;
        this.isCreatingNewNode = false;

        // Clear the addActionToNodeUuid flag
        this.addActionToNodeUuid = null;

        return;
      }

      // If we couldn't find the node, clear the flag and continue with normal flow
      this.addActionToNodeUuid = null;
    }

    // Create a temporary node structure for editing (not added to store yet)
    const nodeUuid = generateUUID();

    // Determine if this is an action type or a node type
    // Actions need to be wrapped in an execute_actions node
    const isActionType = selection.nodeType in ACTION_CONFIG;
    const nodeType = isActionType ? 'execute_actions' : selection.nodeType;

    // For nodes with routers, initialize an empty router to ensure fromFormData works correctly
    const nodeConfig = NODE_CONFIG[nodeType];
    const hasRouter =
      nodeConfig?.form &&
      Object.keys(nodeConfig.form).some(
        (key) =>
          ['rules', 'categories', 'cases'].includes(key) ||
          nodeConfig.form[key]?.type === 'array'
      );

    const tempNode: Node = {
      uuid: nodeUuid,
      actions: [],
      exits: hasRouter
        ? [] // Router-based nodes will generate their own exits
        : [
            {
              uuid: generateUUID(),
              destination_uuid: null
            }
          ]
    };

    if (hasRouter) {
      // This node uses a router - initialize it with empty structure
      tempNode.router = {
        type: 'switch',
        categories: [],
        cases: [],
        operand: '@input.text',
        default_category_uuid: undefined
      };
    }

    const tempNodeUI: NodeUI = {
      position: {
        left: selection.position.x,
        top: selection.position.y
      },
      type: nodeType as any,
      config: {}
    };

    // Mark that we're creating a new node and store the position
    this.isCreatingNewNode = true;
    this.pendingNodePosition = {
      left: selection.position.x,
      top: selection.position.y
    };

    // Open the node editor with the temporary node
    this.editingNode = tempNode;
    this.editingNodeUI = tempNodeUI;

    // If this is an action type, we also need to set up an editing action
    if (isActionType) {
      const actionUuid = generateUUID();
      this.editingAction = {
        uuid: actionUuid,
        type: selection.nodeType as any
      } as Action;
    }
  }

  private handleActionEditRequested(event: CustomEvent): void {
    // For action editing, we set the action and find the corresponding node
    this.editingAction = event.detail.action;

    // Find the node that contains this action
    const nodeUuid = event.detail.nodeUuid;
    const node = this.definition.nodes.find((n) => n.uuid === nodeUuid);

    if (node) {
      this.editingNode = node;
      this.editingNodeUI = this.definition._ui.nodes[nodeUuid];
    }
  }

  private handleAddActionRequested(event: CustomEvent): void {
    // Get the node where we want to add the action
    const nodeUuid = event.detail.nodeUuid;
    const node = this.definition.nodes.find((n) => n.uuid === nodeUuid);

    if (!node) {
      return;
    }

    // Get the node's position to place the selector near it
    const nodeUI = this.definition._ui.nodes[nodeUuid];
    if (!nodeUI) {
      return;
    }

    // Show the node type selector in action mode, excluding branching actions
    const selector = this.querySelector(
      'temba-node-type-selector'
    ) as NodeTypeSelector;
    if (selector) {
      // Show the selector near the node, using a mode that excludes branching actions
      selector.show('action-no-branching', {
        x: nodeUI.position.left,
        y: nodeUI.position.top
      });

      // Store the node UUID so we know which node to add the action to
      this.addActionToNodeUuid = nodeUuid;
    }
  }

  private handleNodeEditRequested(event: CustomEvent): void {
    this.editingNode = event.detail.node;
    this.editingNodeUI = event.detail.nodeUI;
  }

  private handleActionSaved(updatedAction: Action): void {
    if (this.editingNode && this.editingAction) {
      let updatedActions: Action[];

      // Check if this action already exists in the node
      const existingActionIndex = this.editingNode.actions.findIndex(
        (action) => action.uuid === this.editingAction.uuid
      );

      if (existingActionIndex >= 0) {
        // Update existing action
        updatedActions = this.editingNode.actions.map((action) =>
          action.uuid === this.editingAction.uuid ? updatedAction : action
        );
      } else {
        // Add new action
        updatedActions = [...this.editingNode.actions, updatedAction];
      }

      const updatedNode = { ...this.editingNode, actions: updatedActions };

      // Check if we're creating a new node or updating an existing one
      if (this.isCreatingNewNode) {
        // This is a new node with a new action - add it to the store
        const store = getStore();

        const nodeUI: NodeUI = {
          position: this.pendingNodePosition || { left: 0, top: 0 },
          type: this.editingNodeUI?.type,
          config: {}
        };

        // Add the node to the store
        store.getState().addNode(updatedNode, nodeUI);

        // Reset the creation flags
        this.isCreatingNewNode = false;
        this.pendingNodePosition = null;

        // Repaint jsplumb connections
        if (this.plumber) {
          requestAnimationFrame(() => {
            this.plumber.repaintEverything();
          });
        }
      } else {
        // Update existing node in the store
        getStore()?.getState().updateNode(this.editingNode.uuid, updatedNode);

        // Repaint jsplumb connections in case node size changed
        if (this.plumber) {
          // Use requestAnimationFrame to ensure DOM has been updated first
          requestAnimationFrame(() => {
            this.plumber.repaintEverything();
          });
        }
      }
    }
    this.closeNodeEditor();
  }

  private closeNodeEditor(): void {
    this.editingNode = null;
    this.editingNodeUI = null;
    this.editingAction = null;
  }

  private handleActionEditCanceled(): void {
    // If we were creating a new node, just discard it
    if (this.isCreatingNewNode) {
      this.isCreatingNewNode = false;
      this.pendingNodePosition = null;
    }
    this.closeNodeEditor();
  }

  private handleNodeSaved(
    updatedNode: Node,
    uiConfig?: Record<string, any>
  ): void {
    if (this.editingNode) {
      if (this.isCreatingNewNode) {
        // This is a new node - add it to the store for the first time
        const store = getStore();

        const nodeUI: NodeUI = {
          position: this.pendingNodePosition || { left: 0, top: 0 },
          type: this.editingNodeUI?.type,
          config: uiConfig || {}
        };

        // Add the node to the store
        store.getState().addNode(updatedNode, nodeUI);

        // Reset the creation flags
        this.isCreatingNewNode = false;
        this.pendingNodePosition = null;
      } else {
        // This is an existing node - update it
        // Clean up jsPlumb connections for removed exits before updating the node
        if (this.plumber) {
          const oldExits = this.editingNode.exits || [];
          const newExits = updatedNode.exits || [];

          // Find exits that were removed
          const removedExits = oldExits.filter(
            (oldExit) =>
              !newExits.find((newExit) => newExit.uuid === oldExit.uuid)
          );

          // Remove jsPlumb connections for removed exits
          removedExits.forEach((exit) => {
            this.plumber.removeExitConnection(exit.uuid);
          });
        }

        this.plumber.revalidate([updatedNode.uuid]);

        // Update the node in the store
        getStore()?.getState().updateNode(this.editingNode.uuid, updatedNode);

        // Update the UI config if provided
        if (uiConfig) {
          getStore()?.getState().updateNodeUIConfig(updatedNode.uuid, uiConfig);
        }
      }

      // Repaint jsplumb connections in case node size changed
      if (this.plumber) {
        // Use requestAnimationFrame to ensure DOM has been updated first
        requestAnimationFrame(() => {
          this.plumber.repaintEverything();
        });
      }
    }
    this.closeNodeEditor();
  }

  private handleNodeEditCanceled(): void {
    // If we were creating a new node, just discard it
    if (this.isCreatingNewNode) {
      this.isCreatingNewNode = false;
      this.pendingNodePosition = null;
    }
    this.closeNodeEditor();
  }

  private getNodeAtPosition(mouseX: number, mouseY: number): string | null {
    // Get all node elements
    const nodeElements = this.querySelectorAll('temba-flow-node');

    for (const nodeElement of Array.from(nodeElements)) {
      const rect = nodeElement.getBoundingClientRect();

      if (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
      ) {
        return nodeElement.getAttribute('data-node-uuid');
      }
    }

    return null;
  }

  private calculateCanvasDropPosition(
    mouseX: number,
    mouseY: number,
    applyGridSnapping: boolean = true
  ): FlowPosition {
    // calculate the position on the canvas
    const canvas = this.querySelector('#canvas');
    if (!canvas) return { left: 0, top: 0 };

    const canvasRect = canvas.getBoundingClientRect();

    // calculate position relative to canvas
    // canvasRect gives us the canvas position in the viewport, which already accounts for scroll
    // so we just need mouseX/Y - canvasRect.left/top to get position within canvas
    const left = mouseX - canvasRect.left - DROP_PREVIEW_OFFSET_X;
    const top = mouseY - canvasRect.top - DROP_PREVIEW_OFFSET_Y;

    // Apply grid snapping only if requested (for final drop position)
    if (applyGridSnapping) {
      return {
        left: snapToGrid(left),
        top: snapToGrid(top)
      };
    }

    return { left, top };
  }

  private handleActionDragExternal(event: CustomEvent): void {
    const {
      action,
      nodeUuid,
      actionIndex,
      mouseX,
      mouseY,
      actionHeight = 60
    } = event.detail;

    // Check if mouse is over another execute_actions node
    const targetNode = this.getNodeAtPosition(mouseX, mouseY);

    if (targetNode && targetNode !== nodeUuid) {
      const targetNodeUI = this.definition._ui.nodes[targetNode];
      const targetNodeDef = this.definition.nodes.find(
        (n) => n.uuid === targetNode
      );

      // Only allow dropping on execute_actions nodes, and not the source node
      if (targetNodeUI?.type === 'execute_actions' && targetNodeDef) {
        // If we moved to a different target node, clear the previous one's placeholder
        if (
          this.previousActionDragTargetNodeUuid &&
          this.previousActionDragTargetNodeUuid !== targetNode
        ) {
          const previousElement = this.querySelector(
            `temba-flow-node[data-node-uuid="${this.previousActionDragTargetNodeUuid}"]`
          );
          if (previousElement) {
            previousElement.dispatchEvent(
              new CustomEvent('action-drag-leave', {
                detail: {},
                bubbles: false
              })
            );
          }
        }

        // Update target node for drop handling
        this.actionDragTargetNodeUuid = targetNode;
        this.previousActionDragTargetNodeUuid = targetNode;

        // Hide canvas preview when over a valid target
        this.canvasDropPreview = null;

        // Tell source node to show ghost (we're over a valid target)
        const sourceElement = this.querySelector(
          `temba-flow-node[data-node-uuid="${nodeUuid}"]`
        );
        if (sourceElement) {
          sourceElement.dispatchEvent(
            new CustomEvent('action-show-ghost', {
              detail: {},
              bubbles: false
            })
          );
        }

        // Notify the target node about the drag
        const targetElement = this.querySelector(
          `temba-flow-node[data-node-uuid="${targetNode}"]`
        );
        if (targetElement) {
          targetElement.dispatchEvent(
            new CustomEvent('action-drag-over', {
              detail: {
                action,
                sourceNodeUuid: nodeUuid,
                actionIndex,
                mouseX,
                mouseY,
                actionHeight
              },
              bubbles: false
            })
          );
        }

        this.requestUpdate();
        return;
      }
    }

    // Not over a valid target node, clear any previous target's placeholder
    if (this.previousActionDragTargetNodeUuid) {
      const previousElement = this.querySelector(
        `temba-flow-node[data-node-uuid="${this.previousActionDragTargetNodeUuid}"]`
      );
      if (previousElement) {
        previousElement.dispatchEvent(
          new CustomEvent('action-drag-leave', {
            detail: {},
            bubbles: false
          })
        );
      }
      this.previousActionDragTargetNodeUuid = null;
    }

    this.actionDragTargetNodeUuid = null;

    // Tell source node to hide ghost (we're not over a valid target)
    const sourceElement = this.querySelector(
      `temba-flow-node[data-node-uuid="${nodeUuid}"]`
    );
    if (sourceElement) {
      sourceElement.dispatchEvent(
        new CustomEvent('action-hide-ghost', {
          detail: {},
          bubbles: false
        })
      );
    }

    // Don't snap to grid for preview - let it follow cursor smoothly
    const position = this.calculateCanvasDropPosition(mouseX, mouseY, false);

    this.canvasDropPreview = {
      action,
      nodeUuid,
      actionIndex,
      position,
      actionHeight
    };

    // Force re-render to update preview position
    this.requestUpdate();
  }

  private handleActionDragInternal(_event: CustomEvent): void {
    // Clear any previous target's placeholder when returning to internal drag
    if (this.previousActionDragTargetNodeUuid) {
      const previousElement = this.querySelector(
        `temba-flow-node[data-node-uuid="${this.previousActionDragTargetNodeUuid}"]`
      );
      if (previousElement) {
        previousElement.dispatchEvent(
          new CustomEvent('action-drag-leave', {
            detail: {},
            bubbles: false
          })
        );
      }
      this.previousActionDragTargetNodeUuid = null;
    }

    this.canvasDropPreview = null;
    this.actionDragTargetNodeUuid = null;
  }

  private handleActionDropExternal(event: CustomEvent): void {
    const { action, nodeUuid, actionIndex, mouseX, mouseY } = event.detail;

    // Check if we're dropping on an existing execute_actions node
    const targetNodeUuid = this.actionDragTargetNodeUuid;

    if (targetNodeUuid && targetNodeUuid !== nodeUuid) {
      // Dropping on another node - notify the target node to handle the drop
      const targetElement = this.querySelector(
        `temba-flow-node[data-node-uuid="${targetNodeUuid}"]`
      );
      if (targetElement) {
        targetElement.dispatchEvent(
          new CustomEvent('action-drop', {
            detail: {
              action,
              sourceNodeUuid: nodeUuid,
              actionIndex,
              mouseX,
              mouseY
            },
            bubbles: false
          })
        );
      }

      // Clear state
      this.canvasDropPreview = null;
      this.actionDragTargetNodeUuid = null;
      return;
    }

    // Not dropping on another node, create a new one on canvas
    // Snap to grid for the final drop position
    const position = this.calculateCanvasDropPosition(mouseX, mouseY, true);

    // remove the action from the original node
    const originalNode = this.definition.nodes.find((n) => n.uuid === nodeUuid);
    if (!originalNode) return;

    const updatedActions = originalNode.actions.filter(
      (_a, idx) => idx !== actionIndex
    );

    // if no actions remain, delete the node
    if (updatedActions.length === 0) {
      getStore()?.getState().removeNodes([nodeUuid]);
    } else {
      // update the node
      const updatedNode = { ...originalNode, actions: updatedActions };
      getStore()?.getState().updateNode(nodeUuid, updatedNode);
    }

    // create a new execute_actions node with the dropped action
    const newNode: Node = {
      uuid: generateUUID(),
      actions: [action],
      exits: [
        {
          uuid: generateUUID(),
          destination_uuid: null
        }
      ]
    };

    const newNodeUI: NodeUI = {
      position,
      type: 'execute_actions',
      config: {}
    };

    // add the new node
    getStore()?.getState().addNode(newNode, newNodeUI);

    // clear the preview
    this.canvasDropPreview = null;
    this.actionDragTargetNodeUuid = null;

    // repaint connections
    if (this.plumber) {
      requestAnimationFrame(() => {
        this.plumber.repaintEverything();
      });
    }
  }

  private renderLanguageToolbar(): TemplateResult {
    if (!this.definition) {
      return html``;
    }

    const baseLanguage = this.definition.language;

    return html`
      <div id="language-toolbar">
        <label>Language:</label>
        <div class="language-selector">
          ${this.AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = this.languageCode === lang.code;
            const isBase = lang.code === baseLanguage;
            const cssClass = isActive
              ? isBase
                ? 'active'
                : 'translating'
              : '';

            return html`
              <button
                class="language-button ${cssClass}"
                @click=${() => this.handleLanguageChange(lang.code)}
              >
                ${lang.name}
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }

  public render(): TemplateResult {
    // we have to embed our own style since we are in light DOM
    const style = html`<style>
      ${unsafeCSS(Editor.styles.cssText)}
      ${unsafeCSS(CanvasNode.styles.cssText)}
    </style>`;

    const stickies = this.definition?._ui?.stickies || {};

    return html`${style} ${this.renderLanguageToolbar()}
      <div id="editor">
        <div
          id="grid"
          style="min-width:100%;width:${this.canvasSize.width}px; height:${this
            .canvasSize.height}px"
        >
          <div id="canvas">
            ${this.definition
              ? repeat(
                  this.definition.nodes,
                  (node) => node.uuid,
                  (node) => {
                    const position = this.definition._ui?.nodes[node.uuid]
                      ?.position || {
                      left: 0,
                      top: 0
                    };

                    const dragging =
                      this.isDragging &&
                      this.currentDragItem?.uuid === node.uuid;

                    const selected = this.selectedItems.has(node.uuid);

                    return html`<temba-flow-node
                      class="draggable ${dragging ? 'dragging' : ''} ${selected
                        ? 'selected'
                        : ''}"
                      @mousedown=${this.handleMouseDown.bind(this)}
                      uuid=${node.uuid}
                      data-node-uuid=${node.uuid}
                      style="left:${position.left}px; top:${position.top}px"
                      .plumber=${this.plumber}
                      .node=${node}
                      .ui=${this.definition._ui.nodes[node.uuid]}
                      @temba-node-deleted=${(event) => {
                        this.deleteNodes([event.detail.uuid]);
                      }}
                    ></temba-flow-node>`;
                  }
                )
              : html`<temba-loading></temba-loading>`}
            ${repeat(
              Object.entries(stickies),
              ([uuid]) => uuid,
              ([uuid, sticky]) => {
                const position = sticky.position || { left: 0, top: 0 };
                const dragging =
                  this.isDragging && this.currentDragItem?.uuid === uuid;
                const selected = this.selectedItems.has(uuid);
                return html`<temba-sticky-note
                  class="draggable ${dragging ? 'dragging' : ''} ${selected
                    ? 'selected'
                    : ''}"
                  @mousedown=${this.handleMouseDown.bind(this)}
                  style="left:${position.left}px; top:${position.top}px; z-index: ${1000 +
                  position.top}"
                  uuid=${uuid}
                  .data=${sticky}
                  .dragging=${dragging}
                  .selected=${selected}
                ></temba-sticky-note>`;
              }
            )}
            ${this.renderSelectionBox()} ${this.renderCanvasDropPreview()}
          </div>
        </div>
      </div>

      ${this.editingNode || this.editingAction
        ? html`<temba-node-editor
            .node=${this.editingNode}
            .nodeUI=${this.editingNodeUI}
            .action=${this.editingAction}
            @temba-node-saved=${(e: CustomEvent) =>
              this.handleNodeSaved(e.detail.node, e.detail.uiConfig)}
            @temba-action-saved=${(e: CustomEvent) =>
              this.handleActionSaved(e.detail.action)}
            @temba-node-edit-cancelled=${this.handleNodeEditCanceled}
          ></temba-node-editor>`
        : ''}

      <temba-canvas-menu></temba-canvas-menu>
      <temba-node-type-selector></temba-node-type-selector> `;
  }
}
