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
import { CustomEventType, Workspace } from '../interfaces';
import { generateUUID, postJSON } from '../utils';
import { ACTION_CONFIG, NODE_CONFIG } from './config';
import { ACTION_GROUP_METADATA } from './types';
import { Checkbox } from '../form/Checkbox';

import { Plumber } from './Plumber';
import { CanvasNode } from './CanvasNode';
import { Dialog } from '../layout/Dialog';
import { Connection } from '@jsplumb/browser-ui';
import { CanvasMenu, CanvasMenuSelection } from './CanvasMenu';
import { NodeTypeSelector, NodeTypeSelection } from './NodeTypeSelector';
import {
  getNodeBounds,
  calculateReflowPositions,
  NodeBounds,
  nodesOverlap
} from './utils';

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

type TranslationType = 'property' | 'category';

interface TranslationEntry {
  uuid: string;
  type: TranslationType;
  attribute: string;
  from: string;
  to: string | null;
}

interface TranslationBundle {
  nodeUuid: string;
  actionUuid?: string;
  translations: TranslationEntry[];
}

interface TranslationModel {
  uuid: string;
  name: string;
  description?: string;
}

interface LocalizationUpdate {
  uuid: string;
  translations: Record<string, string>;
}

const AUTO_TRANSLATE_MODELS_ENDPOINT = '/api/internal/llms.json';

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

  @property({ type: String })
  public flowType: string = 'message';

  @property({ type: Array })
  public features: string[] = [];

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

  @fromStore(zustand, (state: AppState) => state.workspace)
  private workspace!: Workspace;

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

  @state()
  private localizationWindowHidden = true;

  @state()
  private translationFilters: { categories: boolean } = {
    categories: false
  };

  @state()
  private translationSettingsExpanded = false;

  @state()
  private autoTranslateDialogOpen = false;

  @state()
  private autoTranslating = false;

  @state()
  private autoTranslateModel: TranslationModel | null = null;

  @state()
  private autoTranslateError: string | null = null;

  private translationCache = new Map<string, string>();

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

  private getAvailableLanguages(): Array<{ code: string; name: string }> {
    // Use languages from workspace if available
    if (this.workspace?.languages && this.workspace.languages.length > 0) {
      const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
      return this.workspace.languages
        .map((code) => {
          try {
            const name = languageNames.of(code);
            return name ? { code, name } : { code, name: code };
          } catch {
            return { code, name: code };
          }
        })
        .filter((lang) => lang.code && lang.name);
    }

    // Fall back to flow definition languages if available
    if (
      this.definition?._ui?.languages &&
      this.definition._ui.languages.length > 0
    ) {
      return this.definition._ui.languages.map((lang: any) => ({
        code: typeof lang === 'string' ? lang : lang.iso || lang.code,
        name: typeof lang === 'string' ? lang : lang.name
      }));
    }

    // No languages available
    return [];
  }

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

      .localization-window-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
      }

      .localization-header {
        font-size: 13px;
        color: #4b5563;
        line-height: 1.4;
      }

      .localization-language-select {
        --color-widget-border: #d1d5db;
        --color-widget-background: #fff;
      }

      .localization-language-row {
        display: flex;
        align-items: flex-end;
        gap: 12px;
      }

      .localization-language-row temba-select {
        flex: 1;
      }

      .localization-progress {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .localization-progress-bar-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .localization-progress-trigger {
        flex: 1;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
      }

      .localization-progress-trigger:focus-visible {
        outline: 2px solid #94a3b8;
        outline-offset: 2px;
      }

      .localization-progress-trigger temba-progress {
        flex: 1;
      }

      .localization-progress h5 {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }

      .localization-progress-summary {
        font-size: 12px;
        color: #6b7280;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 20px;
      }

      .translation-settings-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: none;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }

      .translation-settings-label {
        font-size: 12px;
        color: #6b7280;
      }

      .translation-settings-toggle:focus-visible {
        outline: 2px solid #94a3b8;
        outline-offset: 2px;
      }

      .translation-settings-arrow {
        width: 8px;
        height: 8px;
        border-right: 2px solid currentColor;
        border-bottom: 2px solid currentColor;
        transform: rotate(-45deg);
        transition: transform 0.2s ease;
        margin-left: 2px;
      }

      .translation-settings-arrow.expanded {
        transform: rotate(45deg);
      }

      .translation-settings {
      }

      .translation-settings-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .translation-settings-row temba-checkbox {
        width: 100%;
      }

      .auto-translate-button {
        background: var(--color-primary-dark);
        border: none;
        color: #fff;
        padding: 10px 12px;
        border-radius: var(--curvature);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      .auto-translate-button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .auto-translate-error {
        font-size: 12px;
        color: #b91c1c;
      }

      .auto-translate-dialog-content {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        font-size: 14px;
        color: #374151;
      }

      .auto-translate-dialog-content p {
        margin: 0;
      }

      .auto-translate-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #6b7280;
      }

      .auto-translate-empty {
        font-size: 13px;
        color: #6b7280;
      }

      .localization-empty {
        font-size: 13px;
        color: #9ca3af;
        white-space: nowrap;
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

      // Set flowType from the loaded definition
      if (this.definition?.type) {
        this.flowType = this.getFlowTypeFromDefinition(this.definition.type);
      }

      const filters = this.definition?._ui?.translation_filters || {
        categories: false
      };
      const normalizedFilters = {
        categories: !!filters.categories
      };

      if (this.translationFilters.categories !== normalizedFilters.categories) {
        this.translationFilters = normalizedFilters;
      }

      this.translationCache.clear();
    }

    if (changes.has('dirtyDate')) {
      if (this.dirtyDate) {
        this.debouncedSave();
      }
    }

    if (changes.has('languageCode')) {
      this.translationCache.clear();
    }
  }

  /**
   * Map FlowDefinition type to Editor flowType
   * FlowDefinition uses: 'messaging', 'messaging_background', 'messaging_offline', 'voice'
   * Editor uses: 'message', 'voice', 'background'
   */
  private getFlowTypeFromDefinition(definitionType: string): string {
    if (definitionType === 'voice') {
      return 'voice';
    } else if (
      definitionType === 'messaging_background' ||
      definitionType === 'messaging_offline'
    ) {
      return 'background';
    } else {
      // 'messaging' or any other messaging type defaults to 'message'
      return 'message';
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
      .postJSON(`/flow/revisions/${this.flow}/`, this.definition)
      .then((response) => {
        // Update flow info and revision with the response data
        if (response.json) {
          const state = getStore().getState();

          if (response.json.info) {
            state.setFlowInfo(response.json.info);
          }

          if (response.json.revision?.revision !== undefined) {
            state.setRevision(response.json.revision.revision);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to save flow:', error);
      });

    getStore().getState().setDirtyDate(null);
  }

  private handleLanguageChange(languageCode: string): void {
    zustand.getState().setLanguageCode(languageCode);

    // Repaint connections after language change since node sizes can change
    if (this.plumber) {
      requestAnimationFrame(() => {
        this.plumber.repaintEverything();
      });
    }
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

    // Listen for node deletion events
    this.addEventListener(
      CustomEventType.NodeDeleted,
      this.handleNodeDeleted.bind(this)
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

  /**
   * Checks for node collisions and reflows nodes as needed.
   * Nodes are only moved downward to resolve collisions.
   *
   * @param movedNodeUuids - UUIDs of nodes that were just moved/dropped
   * @param droppedNodeUuid - UUID of the specific node that was dropped (if applicable)
   * @param dropTargetBounds - Bounds of the node that was dropped onto (if applicable)
   */
  private checkCollisionsAndReflow(
    movedNodeUuids: string[],
    droppedNodeUuid: string | null = null,
    dropTargetBounds: NodeBounds | null = null
  ): void {
    if (!this.definition) return;

    // Get all node bounds (only for actual nodes, not stickies)
    const allBounds: NodeBounds[] = [];

    for (const node of this.definition.nodes) {
      const nodeUI = this.definition._ui?.nodes[node.uuid];
      if (!nodeUI?.position) continue;

      const bounds = getNodeBounds(node.uuid, nodeUI.position);
      if (bounds) {
        allBounds.push(bounds);
      }
    }

    // Check if we need to determine midpoint priority for a dropped node
    let droppedBelowMidpoint = false;
    if (droppedNodeUuid && dropTargetBounds) {
      const droppedBounds = allBounds.find((b) => b.uuid === droppedNodeUuid);
      if (droppedBounds) {
        // Check if the dropped node's center is below the midpoint of the target
        const droppedCenter = droppedBounds.top + droppedBounds.height / 2;
        const targetMidpoint =
          dropTargetBounds.top + dropTargetBounds.height / 2;
        droppedBelowMidpoint = droppedCenter > targetMidpoint;
      }
    }

    // Calculate reflow positions for each moved node
    const allReflowPositions = new Map<string, FlowPosition>();

    for (const movedUuid of movedNodeUuids) {
      const movedBounds = allBounds.find((b) => b.uuid === movedUuid);
      if (!movedBounds) continue;

      // Calculate reflow for this moved node
      const reflowPositions = calculateReflowPositions(
        movedUuid,
        movedBounds,
        allBounds,
        droppedNodeUuid === movedUuid ? droppedBelowMidpoint : false
      );

      // Merge into all reflow positions
      for (const [uuid, position] of reflowPositions.entries()) {
        allReflowPositions.set(uuid, position);
      }
    }

    // If there are positions to update, apply them with animation
    if (allReflowPositions.size > 0) {
      this.applyReflowWithAnimation(allReflowPositions);
    }
  }

  /**
   * Applies reflow positions with CSS animations
   */
  private applyReflowWithAnimation(positions: Map<string, FlowPosition>): void {
    // Apply positions with transition
    for (const [uuid, position] of positions.entries()) {
      const element = this.querySelector(`[id="${uuid}"]`) as HTMLElement;
      if (element) {
        // Enable transition
        element.style.transition = 'top 0.3s ease-out, left 0.3s ease-out';

        // Force a reflow to ensure the transition property is applied before changing position
        void element.offsetHeight;

        // Update position
        element.style.left = `${position.left}px`;
        element.style.top = `${position.top}px`;

        // Remove transition after animation completes
        setTimeout(() => {
          element.style.transition = '';
        }, 350);
      }
    }

    // Update the store with new positions after a brief delay to allow animation to start
    setTimeout(() => {
      const positionsObj: { [uuid: string]: FlowPosition } = {};
      positions.forEach((pos, uuid) => {
        positionsObj[uuid] = pos;
      });

      getStore().getState().updateCanvasPositions(positionsObj);
    }, 50);

    // Repaint connections after animation
    setTimeout(() => {
      this.plumber.repaintEverything();
    }, 400);
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

        // Check for collisions and reflow nodes after updating positions
        // Filter to only check nodes (not stickies)
        const nodeUuids = itemsToMove.filter((uuid) =>
          this.definition.nodes.find((node) => node.uuid === uuid)
        );

        if (nodeUuids.length > 0) {
          // Allow DOM to update before checking collisions
          setTimeout(() => {
            // If only one node was moved, detect which node it might have been dropped onto
            let droppedNodeUuid: string | null = null;
            let dropTargetBounds: NodeBounds | null = null;

            if (nodeUuids.length === 1) {
              droppedNodeUuid = nodeUuids[0];
              const droppedNodeUI = this.definition._ui?.nodes[droppedNodeUuid];
              
              if (droppedNodeUI?.position) {
                const droppedBounds = getNodeBounds(
                  droppedNodeUuid,
                  droppedNodeUI.position
                );

                if (droppedBounds) {
                  // Find which node (if any) the dropped node overlaps with
                  for (const node of this.definition.nodes) {
                    if (node.uuid === droppedNodeUuid) continue;
                    
                    const nodeUI = this.definition._ui?.nodes[node.uuid];
                    if (!nodeUI?.position) continue;

                    const targetBounds = getNodeBounds(node.uuid, nodeUI.position);
                    if (targetBounds && nodesOverlap(droppedBounds, targetBounds)) {
                      dropTargetBounds = targetBounds;
                      break; // Use the first overlapping node
                    }
                  }
                }
              }
            }

            this.checkCollisionsAndReflow(nodeUuids, droppedNodeUuid, dropTargetBounds);
          }, 0);
        } else {
          // No nodes moved, just repaint connections
          setTimeout(() => {
            this.plumber.repaintEverything();
          }, 0);
        }
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

  private handleNodeDeleted(event: CustomEvent): void {
    const nodeUuid = event.detail.uuid;
    if (nodeUuid) {
      this.deleteNodes([nodeUuid]);
    }
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

        // Check for collisions and reflow
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([updatedNode.uuid]);
        });
      } else {
        // Update existing node in the store
        getStore()?.getState().updateNode(this.editingNode.uuid, updatedNode);

        // Check for collisions and reflow in case node size changed
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([this.editingNode.uuid]);
        });
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

        // Check for collisions and reflow
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([updatedNode.uuid]);
        });
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

        // Check for collisions and reflow in case node size changed
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([this.editingNode.uuid]);
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
      actionHeight = 60,
      isLastAction = false
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

    const sourceElement = this.querySelector(
      `temba-flow-node[data-node-uuid="${nodeUuid}"]`
    );

    // Show canvas drop preview only if this is NOT the last action
    // Last actions can only be dropped on other nodes, not on canvas
    if (!isLastAction) {
      // Hide ghost when showing canvas preview (for canvas drops)
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
    } else {
      // For last action, keep ghost visible (can't drop on canvas)
      if (sourceElement) {
        sourceElement.dispatchEvent(
          new CustomEvent('action-show-ghost', {
            detail: {},
            bubbles: false
          })
        );
      }

      // Clear any existing preview for last action
      this.canvasDropPreview = null;
    }

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
    const {
      action,
      nodeUuid,
      actionIndex,
      mouseX,
      mouseY,
      isLastAction = false
    } = event.detail;

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

    // If this is the last action and we're not dropping on another node, do nothing
    // Last actions can only be moved to other nodes, not dropped on canvas
    if (isLastAction) {
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

    // Check for collisions and reflow after adding new node
    requestAnimationFrame(() => {
      this.checkCollisionsAndReflow([newNode.uuid]);
    });
  }

  private getLocalizationLanguages(): Array<{ code: string; name: string }> {
    if (!this.definition) {
      return [];
    }

    const baseLanguage = this.definition.language;
    return this.getAvailableLanguages().filter(
      (lang) => lang.code !== baseLanguage
    );
  }

  private getLocalizationProgress(languageCode: string): {
    total: number;
    localized: number;
  } {
    if (
      !this.definition ||
      !languageCode ||
      languageCode === this.definition.language
    ) {
      return { total: 0, localized: 0 };
    }

    const bundles = this.buildTranslationBundles(
      this.translationFilters.categories,
      languageCode
    );
    return this.getTranslationCounts(bundles);
  }

  private getLanguageLocalization(languageCode: string): Record<string, any> {
    if (!this.definition?.localization) {
      return {};
    }
    return this.definition.localization[languageCode] || {};
  }

  private buildTranslationBundles(
    includeCategories: boolean,
    languageCode: string = this.languageCode
  ): TranslationBundle[] {
    if (
      !this.definition ||
      !languageCode ||
      languageCode === this.definition.language
    ) {
      return [];
    }

    const languageLocalization = this.getLanguageLocalization(languageCode);
    const bundles: TranslationBundle[] = [];

    this.definition.nodes.forEach((node) => {
      node.actions.forEach((action) => {
        const config = ACTION_CONFIG[action.type];
        if (!config?.localizable || config.localizable.length === 0) {
          return;
        }

        // For send_msg actions, only count 'text' for progress tracking
        // (quick_replies and attachments are still localizable but don't count toward progress)
        const localizableKeys =
          action.type === 'send_msg'
            ? config.localizable.filter((key) => key === 'text')
            : config.localizable;

        const translations = this.findTranslations(
          'property',
          action.uuid,
          localizableKeys,
          action,
          languageLocalization
        );

        if (translations.length > 0) {
          bundles.push({
            nodeUuid: node.uuid,
            actionUuid: action.uuid,
            translations
          });
        }
      });

      if (!includeCategories) {
        return;
      }

      const nodeUI = this.definition._ui?.nodes?.[node.uuid];
      const nodeType = nodeUI?.type;
      if (!nodeType) {
        return;
      }

      const nodeConfig = NODE_CONFIG[nodeType];
      if (
        nodeConfig?.localizable === 'categories' &&
        node.router?.categories?.length
      ) {
        const categoryTranslations = node.router.categories.flatMap(
          (category) =>
            this.findTranslations(
              'category',
              category.uuid,
              ['name'],
              category,
              languageLocalization
            )
        );

        if (categoryTranslations.length > 0) {
          bundles.push({
            nodeUuid: node.uuid,
            translations: categoryTranslations
          });
        }
      }
    });

    return bundles;
  }

  private findTranslations(
    type: TranslationType,
    uuid: string,
    localizeableKeys: string[],
    source: any,
    localization: Record<string, any>
  ): TranslationEntry[] {
    const translations: TranslationEntry[] = [];

    localizeableKeys.forEach((attribute) => {
      if (attribute === 'quick_replies') {
        return;
      }

      const pathSegments = attribute.split('.');
      let from: any = source;
      let to: any = [];

      while (pathSegments.length > 0 && from) {
        if (from.uuid) {
          to = localization[from.uuid];
        }

        const path = pathSegments.shift();
        if (!path) {
          break;
        }

        if (to) {
          to = to[path];
        }
        from = from[path];
      }

      if (!from) {
        return;
      }

      const fromValue = this.formatTranslationValue(from);
      if (!fromValue) {
        return;
      }

      const toValue = to ? this.formatTranslationValue(to) : null;

      translations.push({
        uuid,
        type,
        attribute,
        from: fromValue,
        to: toValue
      });
    });

    return translations;
  }

  private formatTranslationValue(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => this.formatTranslationValue(entry))
        .filter((entry) => !!entry) as string[];
      return normalized.length > 0 ? normalized.join(', ') : null;
    }

    if (typeof value === 'object') {
      if ('name' in value && value.name) {
        return String(value.name);
      }

      if ('arguments' in value && Array.isArray(value.arguments)) {
        return value.arguments.join(' ');
      }

      return null;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return null;
  }

  private getTranslationCounts(bundles: TranslationBundle[]): {
    total: number;
    localized: number;
  } {
    return bundles.reduce(
      (counts, bundle) => {
        bundle.translations.forEach((translation) => {
          counts.total += 1;
          if (translation.to && translation.to.trim().length > 0) {
            counts.localized += 1;
          }
        });
        return counts;
      },
      { total: 0, localized: 0 }
    );
  }

  private handleLocalizationTabClick(): void {
    const languages = this.getLocalizationLanguages();
    if (!languages.length) {
      return;
    }

    this.localizationWindowHidden = false;

    const alreadySelected = languages.some(
      (lang) => lang.code === this.languageCode
    );

    if (!alreadySelected) {
      this.handleLanguageChange(languages[0].code);
    }
  }

  private handleLocalizationLanguageSelect(languageCode: string): void {
    if (languageCode === this.languageCode) {
      return;
    }
    this.handleLanguageChange(languageCode);
  }

  private handleLocalizationLanguageSelectChange(event: CustomEvent): void {
    const select = event.target as any;
    const nextValue = select?.values?.[0]?.value;
    if (nextValue) {
      this.handleLocalizationLanguageSelect(nextValue);
    }
  }

  private handleLocalizationWindowClosed(): void {
    this.localizationWindowHidden = true;

    const baseLanguage = this.definition?.language;
    if (baseLanguage && this.languageCode !== baseLanguage) {
      this.handleLanguageChange(baseLanguage);
    }
  }

  private toggleTranslationSettings(): void {
    this.translationSettingsExpanded = !this.translationSettingsExpanded;
  }

  private handleLocalizationProgressToggleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.translation-settings-toggle')) {
      return;
    }
    this.toggleTranslationSettings();
  }

  private handleLocalizationProgressToggleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleTranslationSettings();
    }
  }

  private handleIncludeCategoriesChange(event: Event): void {
    const checkbox = event.target as Checkbox;
    const categories = checkbox?.checked ?? false;
    this.translationFilters = { categories };
    getStore()?.getState().setTranslationFilters({ categories });
    this.requestUpdate();
  }

  private async handleAutoTranslateClick(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.autoTranslating) {
      this.autoTranslating = false;
      return;
    }

    this.autoTranslateDialogOpen = true;
  }

  private handleAutoTranslateDialogButton(event: CustomEvent): void {
    const button = event.detail?.button;
    if (!button) {
      return;
    }

    if (button.name === 'Translate') {
      if (!this.autoTranslateModel) {
        return;
      }
      this.autoTranslateDialogOpen = false;
      this.autoTranslateError = null;
      this.autoTranslating = true;
      this.runAutoTranslation().catch((error) => {
        console.error('Auto translation failed', error);
        this.autoTranslateError = 'Auto translation failed. Please try again.';
        this.autoTranslating = false;
      });
    } else if (button.name === 'Cancel' || button.name === 'Close') {
      this.autoTranslateDialogOpen = false;
    }
  }

  private handleAutoTranslateModelChange(event: Event): void {
    const select = event.target as any;
    const nextModel = select?.values?.[0] || null;
    this.autoTranslateModel = nextModel;
  }

  private shouldTranslateValue(text: string): boolean {
    if (!text) {
      return false;
    }
    const trimmed = text.trim();
    if (trimmed.length <= 1) {
      return false;
    }
    if (/^\d+$/.test(trimmed)) {
      return false;
    }
    return true;
  }

  private async requestAutoTranslation(text: string): Promise<string | null> {
    if (!this.autoTranslateModel || !this.definition) {
      return null;
    }

    const payload = {
      text,
      lang: {
        from: this.definition.language,
        to: this.languageCode
      }
    };

    const response = await postJSON(
      `/llm/translate/${this.autoTranslateModel.uuid}/`,
      payload
    );

    if (response?.status === 200) {
      const result = response.json?.result || response.json?.text;
      return result ? String(result) : null;
    }

    throw new Error('Auto translation request failed');
  }

  private applyLocalizationUpdates(
    updates: LocalizationUpdate[],
    autoTranslated = false
  ): void {
    if (!updates.length || !this.definition) {
      return;
    }

    const store = getStore();
    if (!store) {
      return;
    }

    updates.forEach(({ uuid, translations }) => {
      const normalized = Object.entries(translations).reduce(
        (acc, [key, value]) => {
          if (!value) {
            return acc;
          }
          acc[key] = Array.isArray(value) ? value : [value];
          return acc;
        },
        {} as Record<string, any>
      );

      const existing =
        this.definition.localization?.[this.languageCode]?.[uuid] || {};
      const merged = { ...existing, ...normalized };

      store.getState().updateLocalization(this.languageCode, uuid, merged);

      if (autoTranslated) {
        zustand
          .getState()
          .markAutoTranslated(
            this.languageCode,
            uuid,
            Object.keys(translations)
          );
      }
    });
  }

  private async runAutoTranslation(): Promise<void> {
    if (
      !this.definition ||
      this.languageCode === this.definition.language ||
      !this.autoTranslateModel
    ) {
      this.autoTranslating = false;
      return;
    }

    const bundles = this.buildTranslationBundles(
      this.translationFilters.categories
    );

    for (const bundle of bundles) {
      if (!this.autoTranslating) {
        break;
      }

      const untranslated = bundle.translations.filter(
        (translation) => !translation.to || translation.to.trim().length === 0
      );

      if (untranslated.length === 0) {
        continue;
      }

      const updates: LocalizationUpdate[] = [];

      for (const translation of untranslated) {
        if (!this.autoTranslating) {
          break;
        }

        if (!this.shouldTranslateValue(translation.from)) {
          continue;
        }

        const cached = this.translationCache.get(translation.from);
        if (cached) {
          updates.push({
            uuid: translation.uuid,
            translations: { [translation.attribute]: cached }
          });
          continue;
        }

        try {
          const result = await this.requestAutoTranslation(translation.from);
          if (result) {
            this.translationCache.set(translation.from, result);
            updates.push({
              uuid: translation.uuid,
              translations: { [translation.attribute]: result }
            });
          }
        } catch (error) {
          console.error('Auto translation request failed', error);
          this.autoTranslateError =
            'Auto translation failed. Please try again.';
          this.autoTranslating = false;
          break;
        }
      }

      if (updates.length > 0) {
        this.applyLocalizationUpdates(updates, true);
      }

      if (!this.autoTranslating) {
        break;
      }
    }

    this.autoTranslating = false;
  }

  private renderLocalizationWindow(): TemplateResult | string {
    const languages = this.getLocalizationLanguages();
    if (!languages.length) {
      return html``;
    }

    const baseLanguage = this.definition?.language;
    const availableLanguages = this.getAvailableLanguages();
    const baseName =
      availableLanguages.find((lang) => lang.code === baseLanguage)?.name ||
      'Base Language';

    const activeLanguageCode = languages.some(
      (lang) => lang.code === this.languageCode
    )
      ? this.languageCode
      : languages[0]?.code;
    const activeLanguage = activeLanguageCode
      ? languages.find((lang) => lang.code === activeLanguageCode)
      : null;
    const progress = this.getLocalizationProgress(activeLanguageCode || '');
    const includeCategories = this.translationFilters.categories;
    const settingsPanelId = 'translation-settings-panel';
    const remainingTranslations = Math.max(
      progress.total - progress.localized,
      0
    );
    const hasTranslations = progress.total > 0;
    const hasPendingTranslations = remainingTranslations > 0;
    const autoTranslateButtonLabel = this.autoTranslating
      ? 'Stop Auto Translate'
      : 'Auto Translate';
    const autoTranslateButtonDisabled =
      !this.autoTranslating && !hasTranslations;

    return html`
      <temba-floating-window
        id="localization-window"
        header="Translations"
        .width=${360}
        .maxHeight=${600}
        .top=${170}
        color="#6b7280"
        .hidden=${this.localizationWindowHidden}
        @temba-dialog-hidden=${this.handleLocalizationWindowClosed}
      >
        <div class="localization-window-content">
          <div class="localization-header">
            Translate from <strong>${baseName}</strong> to the languages below.
            Closing this window returns you to editing in ${baseName}.
          </div>
          <div class="localization-language-row">
            <temba-select
              flavor="small"
              class="localization-language-select"
              .values=${activeLanguage
                ? [{ name: activeLanguage.name, value: activeLanguage.code }]
                : []}
              @change=${this.handleLocalizationLanguageSelectChange}
            >
              ${languages.map(
                (lang) => html`<temba-option
                  value="${lang.code}"
                  name="${lang.name}"
                ></temba-option>`
              )}
            </temba-select>
            <button
              class="auto-translate-button"
              type="button"
              ?disabled=${autoTranslateButtonDisabled}
              @click=${this.handleAutoTranslateClick}
            >
              ${autoTranslateButtonLabel}
            </button>
          </div>
          <div class="localization-progress">
            <div class="localization-progress-summary">
              ${this.autoTranslating
                ? html`<temba-loading units="3" size="8"></temba-loading>
                    <span>Auto translating remaining text…</span>`
                : !hasTranslations
                ? html`<span>
                    Add content or enable more options to start translating.
                  </span>`
                : hasPendingTranslations
                ? html`<span>
                    ${progress.localized} of ${progress.total} items translated
                  </span>`
                : html`<span>All items are translated.</span>`}
            </div>
            ${this.autoTranslateError
              ? html`<div class="auto-translate-error">
                  ${this.autoTranslateError}
                </div>`
              : ''}
            <div class="localization-progress-bar-row">
              <div
                class="localization-progress-trigger"
                role="button"
                tabindex="0"
                aria-expanded="${this.translationSettingsExpanded}"
                aria-controls="${settingsPanelId}"
                @click=${this.handleLocalizationProgressToggleClick}
                @keydown=${this.handleLocalizationProgressToggleKeydown}
              >
                <temba-progress
                  .current=${progress.localized}
                  .total=${Math.max(progress.total, 1)}
                  .animated=${false}
                ></temba-progress>
              </div>
              <button
                class="translation-settings-toggle"
                type="button"
                @click=${this.toggleTranslationSettings}
                aria-expanded="${this.translationSettingsExpanded}"
                aria-controls="${settingsPanelId}"
              >
                <span
                  class="translation-settings-arrow ${this
                    .translationSettingsExpanded
                    ? 'expanded'
                    : ''}"
                ></span>
              </button>
            </div>
            ${this.translationSettingsExpanded
              ? html`<div id="${settingsPanelId}" class="translation-settings">
                  <div class="translation-settings-row">
                    <temba-checkbox
                      name="include-categories"
                      label="Include categories"
                      ?checked=${includeCategories}
                      style="--checkbox-padding:5px; border-radius:var(--curvature);"
                      @change=${this.handleIncludeCategoriesChange}
                    ></temba-checkbox>
                  </div>
                </div>`
              : ''}
          </div>
        </div>
      </temba-floating-window>
    `;
  }

  private renderAutoTranslateDialog(): TemplateResult | string {
    if (!this.autoTranslateDialogOpen) {
      return html``;
    }

    const selectedModel = this.autoTranslateModel
      ? [this.autoTranslateModel]
      : [];
    const disableTranslate = !this.autoTranslateModel;

    return html`
      <temba-dialog
        header="Auto translate"
        .open=${this.autoTranslateDialogOpen}
        primaryButtonName="Translate"
        cancelButtonName="Cancel"
        size="small"
        .disabled=${disableTranslate}
        @temba-button-clicked=${this.handleAutoTranslateDialogButton}
      >
        <div class="auto-translate-dialog-content">
          <p>
            We'll send any untranslated text to the selected AI model and save
            the responses automatically.
          </p>
          <div class="auto-translate-models">
            <temba-select
              class="auto-translate-model-select"
              endpoint="${AUTO_TRANSLATE_MODELS_ENDPOINT}"
              .valueKey=${'uuid'}
              .values=${selectedModel}
              ?searchable=${true}
              ?clearable=${true}
              placeholder="Select an AI model"
              @change=${this.handleAutoTranslateModelChange}
            ></temba-select>
          </div>
          <p>Only text without translations will be sent.</p>
          ${this.autoTranslateError
            ? html`<div class="auto-translate-error">
                ${this.autoTranslateError}
              </div>`
            : ''}
        </div>
      </temba-dialog>
    `;
  }

  private renderLocalizationTab(): TemplateResult | string {
    const languages = this.getLocalizationLanguages();
    if (!languages.length) {
      return html``;
    }

    return html`
      <temba-floating-tab
        id="localization-tab"
        icon="language"
        label="Translate Flow"
        color="#6b7280"
        top="180"
        .hidden=${!this.localizationWindowHidden}
        @temba-button-clicked=${this.handleLocalizationTabClick}
      ></temba-floating-tab>
    `;
  }

  public render(): TemplateResult {
    // we have to embed our own style since we are in light DOM
    const style = html`<style>
      ${unsafeCSS(Editor.styles.cssText)}
      ${unsafeCSS(CanvasNode.styles.cssText)}
    </style>`;

    const stickies = this.definition?._ui?.stickies || {};

    return html`${style} ${this.renderLocalizationWindow()}
      ${this.renderAutoTranslateDialog()}
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
                  style="left:${position.left}px; top:${position.top}px;"
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
      <temba-node-type-selector
        .flowType=${this.flowType}
        .features=${this.features}
      ></temba-node-type-selector>
      ${this.renderLocalizationTab()} `;
  }
}
