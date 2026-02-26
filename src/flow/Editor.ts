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
import {
  AppState,
  FlowIssue,
  fromStore,
  zustand,
  FLOW_SPEC_VERSION
} from '../store/AppState';
import { RapidElement } from '../RapidElement';
import { repeat } from 'lit-html/directives/repeat.js';
import { CustomEventType, Workspace } from '../interfaces';
import {
  generateUUID,
  postJSON,
  fetchResults,
  getClasses,
  WebResponse
} from '../utils';
import { TEMBA_COMPONENTS_VERSION } from '../version';
import {
  formatIssueMessage,
  getNodeBounds,
  calculateReflowPositions,
  isRightClick,
  NodeBounds,
  snapToGrid
} from './utils';
import { ACTION_CONFIG, NODE_CONFIG } from './config';
import { calculateLayeredLayout, placeStickyNotes } from './reflow';
import { FloatingTab } from '../display/FloatingTab';

interface Revision {
  id: number;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    name?: string;
  };
  created_on: string;
  comment?: string;
}

import { ACTION_GROUP_METADATA } from './types';
import { Checkbox } from '../form/Checkbox';

import {
  Plumber,
  calculateFlowchartPath,
  ARROW_LENGTH,
  ARROW_HALF_WIDTH,
  CURSOR_GAP
} from './Plumber';
import { CanvasNode } from './CanvasNode';
import { Dialog } from '../layout/Dialog';

import { CanvasMenu, CanvasMenuSelection } from './CanvasMenu';
import { NodeTypeSelector, NodeTypeSelection } from './NodeTypeSelector';
import { FloatingWindow } from '../layout/FloatingWindow';
import { Icon } from '../Icons';

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

const SAVE_QUIET_TIME = 2000;

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
const AUTO_SCROLL_EDGE_ZONE = 100;
const AUTO_SCROLL_MAX_SPEED = 15;

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
  // connection SVGs are appended directly to the canvas, so we need light DOM
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

  private activityTimer: number | null = null;
  private activityInterval = 100; // Start with 100ms interval for fast initial load

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private definition!: FlowDefinition;

  @fromStore(zustand, (state: AppState) => state.simulatorActive)
  private simulatorActive!: boolean;

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

  @fromStore(zustand, (state: AppState) => state.getCurrentActivity())
  private activityData!: any;

  @fromStore(zustand, (state: AppState) => state.flowInfo?.issues || [])
  private flowIssues!: FlowIssue[];

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

  // Auto-scroll state
  private autoScrollAnimationId: number | null = null;
  private autoScrollDeltaX = 0;
  private autoScrollDeltaY = 0;
  private lastMouseEvent: MouseEvent | null = null;

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
  private originalConnectionTargetId: string | null = null;

  @state()
  private isValidTarget = true;

  // Canvas-relative source exit position (set at drag start)
  private connectionSourceX: number | null = null;
  private connectionSourceY: number | null = null;

  @state()
  private issuesWindowHidden = true;

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

  @state()
  private revisionsWindowHidden = true;

  @state()
  private revisions: Revision[] = [];

  @state()
  private viewingRevision: Revision | null = null;

  @state()
  private isLoadingRevisions = false;

  @state()
  private isSaving = false;

  @state()
  private saveError: string | null = null;

  @state()
  private zoom = 1.0;

  @state()
  private zoomFitted = false;

  @state()
  private reflowPending = false;

  @state()
  private reflowUnsaved = false;

  private savedReflowPositions: Record<string, FlowPosition> | null = null;

  private preRevertState: {
    definition: FlowDefinition;
    dirtyDate: Date | null;
  } | null = null;

  private translationCache = new Map<string, string>();

  // NodeEditor state - handles both node and action editing
  @state()
  private editingNode: Node | null = null;

  @state()
  private editingNodeUI: NodeUI | null = null;

  @state()
  private editingAction: Action | null = null;

  private dialogOrigin: { x: number; y: number } | null = null;

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

  // Connection placeholder state for dropping connections on empty canvas
  @state()
  private connectionPlaceholder: {
    position: FlowPosition;
    visible: boolean;
    dragUp?: boolean;
  } | null = null;

  // Track pending connection when dropping on canvas
  private pendingCanvasConnection: {
    fromNodeId: string;
    exitId: string;
    position: FlowPosition;
  } | null = null;

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
  private boundWheel = this.handleWheel.bind(this);

  static get styles() {
    return css`
      #editor-container {
        position: relative;
        flex: 1;
        display: flex;
        min-height: 0;
      }

      #editor {
        overflow: scroll;
        flex: 1;
        -webkit-font-smoothing: antialiased;
      }

      temba-floating-tab {
        --floating-tab-right: 15px;
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
        padding-top: 20px;
        transform-origin: 0 0;
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
        transition: none !important;
      }

      #canvas.viewing-revision {
        pointer-events: none;
      }

      #canvas.read-only svg {
        pointer-events: none;
      }

      #grid.viewing-revision {
        background-color: #fff9fc;
        background-image: radial-gradient(
          circle,
          rgba(166, 38, 164, 0.2) 1px,
          transparent 1px
        );
      }

      #grid.viewing-revision temba-flow-node,
      #grid.viewing-revision svg.plumb-connector {
        opacity: 0.5;
      }

      svg.plumb-connector {
        z-index: 10;
      }

      svg.plumb-connector path {
        stroke: var(--color-connectors);
        stroke-width: 3px;
      }

      svg.plumb-connector .plumb-arrow {
        fill: var(--color-connectors);
        stroke: none;
      }

      svg.plumb-connector.hover path {
        stroke: var(--color-success);
      }

      svg.plumb-connector.hover .plumb-arrow {
        fill: var(--color-success);
      }

      #canvas.read-only-connections svg.plumb-connector.hover path {
        stroke: var(--color-connectors);
      }

      #canvas.read-only-connections svg.plumb-connector.hover .plumb-arrow {
        fill: var(--color-connectors);
      }

      #canvas.read-only-connections svg.plumb-connector,
      #canvas.read-only-connections svg.plumb-connector * {
        pointer-events: none !important;
        cursor: default !important;
      }

      svg.plumb-connector.removing path {
        stroke: var(--color-error);
      }

      svg.plumb-connector.removing .plumb-arrow {
        fill: var(--color-error);
      }

      svg.plumb-connector.dragging {
        z-index: 99999;
      }

      /* Active contact count on nodes */
      .active-count {
        position: absolute;
        background: #3498db;
        border: 1px solid #2980b9;
        border-radius: 12px;
        padding: 3px 6px;
        color: #fff;
        font-weight: 500;
        top: -10px;
        left: -10px;
        font-size: 13px;

        text-align: center;
        z-index: 600;
        line-height: 1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      /* Activity overlay badges on connection exit stubs */
      .activity-overlay {
        position: absolute;
        background: #f3f3f3;
        border: 1px solid #d9d9d9;
        color: #333;
        border-radius: 4px;
        padding: 2px 4px;
        font-size: 10px;
        font-weight: 600;
        line-height: 0.9;
        cursor: pointer;
        z-index: 10;
        pointer-events: auto;
        white-space: nowrap;
        user-select: none;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      #grid.viewing-revision .activity-overlay {
        opacity: 0.5;
        pointer-events: none;
      }

      /* Recent contacts popup */
      @keyframes popupBounceIn {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      .recent-contacts-popup {
        display: none;
        position: absolute;
        width: 200px;
        background: #f3f3f3;
        border-radius: 10px;
        box-shadow: 0 1px 3px 1px rgba(130, 130, 130, 0.2);
        z-index: 1015;
        transform-origin: top center;
      }

      .recent-contacts-popup.show {
        display: block;
        animation: popupBounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      .recent-contacts-popup .popup-title {
        background: #999;
        color: #fff;
        padding: 6px 0;
        text-align: center;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        font-size: 12px;
      }

      .recent-contacts-popup .no-contacts-message {
        padding: 15px;
        text-align: center;
        color: #999;
        font-size: 12px;
      }

      .recent-contacts-popup .contact-row {
        padding: 8px 10px;
        border-top: 1px solid #e0e0e0;
        text-align: left;
      }

      .recent-contacts-popup .contact-row:last-child {
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
      }

      .recent-contacts-popup .contact-name {
        display: block;
        font-weight: 500;
        font-size: 12px;
        color: var(--color-link-primary, #1d4ed8);
        cursor: pointer;
      }

      .recent-contacts-popup .contact-name:hover {
        text-decoration: underline;
      }

      .recent-contacts-popup .contact-operand {
        padding-top: 3px;
        font-size: 11px;
        color: #666;
        word-wrap: break-word;
      }

      .recent-contacts-popup .contact-time {
        padding-top: 3px;
        font-size: 10px;
        color: #999;
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

      .revert-button {
        background: var(--color-primary-dark);
        border: none;
        color: #fff;
        padding: 6px 10px;
        border-radius: var(--curvature);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s ease;
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

      .issue-list-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        color: #333;
      }

      .issue-list-item:hover {
        background: #fff5f5;
      }

      .issue-list-item temba-icon {
        color: tomato;
        flex-shrink: 0;
      }

      .empty-flow {
        position: sticky;
        top: 80px;
        left: 0;
        right: 0;
        height: 0;
        display: flex;
        justify-content: center;
        pointer-events: none;
        z-index: 50;
      }

      .empty-flow-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        text-align: center;
        pointer-events: auto;
      }

      .empty-flow-title {
        font-size: 18px;
        font-weight: 600;
        color: #374151;
      }

      .empty-flow-description {
        font-size: 14px;
        color: #6b7280;
        max-width: 320px;
        line-height: 1.5;
      }

      .empty-flow-button {
        background: var(--color-primary-dark);
        border: none;
        color: #fff;
        padding: 10px 20px;
        border-radius: var(--curvature);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      .empty-flow-button:hover {
        opacity: 0.9;
      }

      .save-indicator {
        position: absolute;
        top: 8px;
        right: 240px;
        padding: 6px 10px;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease-in-out;
      }

      .save-indicator.visible {
        opacity: 1;
      }

      .zoom-controls {
        position: absolute;
        top: 8px;
        right: 16px;
        z-index: 4999;
        display: flex;
        align-items: center;
        gap: 2px;
        background: white;
        border-radius: var(--curvature);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        padding: 4px;
        user-select: none;
      }

      .zoom-controls button {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        border-radius: var(--curvature);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        color: #555;
        font-size: 16px;
        line-height: 1;
        outline: none;
      }

      .zoom-controls button:hover {
        background: rgba(0, 0, 0, 0.06);
      }

      .zoom-controls button:disabled {
        opacity: 0.3;
        cursor: default;
        background: transparent;
      }

      .zoom-controls .zoom-level {
        font-size: 12px;
        min-width: 40px;
        text-align: center;
        color: #555;
        font-weight: 500;
      }

      .zoom-controls .zoom-divider {
        width: 1px;
        height: 16px;
        background: #e0e0e0;
        margin: 0 2px;
      }

      .reflow-card {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: white;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .reflow-card .reflow-label {
        white-space: nowrap;
      }

      .reflow-card button {
        border: none;
        border-radius: 6px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.15s ease;
      }

      .reflow-card button:hover {
        opacity: 0.85;
      }

      .reflow-card .reflow-save {
        background: var(--color-primary-dark, #3b82f6);
        color: white;
      }

      .reflow-card .reflow-discard {
        background: rgba(255, 255, 255, 0.2);
        color: white;
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
    this.plumber = new Plumber(this.querySelector('#canvas'), this);
    this.setupGlobalEventListeners();
    this.updateZoomControlPositioning();
    if (changes.has('flow')) {
      getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
      this.fetchRevisions();
    }

    this.plumber.on('connection:drag', (connection: any) => {
      this.dragFromNodeId = connection.data.nodeId;
      this.sourceId = connection.sourceId;
      this.connectionSourceX = connection.sourceX;
      this.connectionSourceY = connection.sourceY;
      this.originalConnectionTargetId = connection.target.id;
    });

    this.plumber.on('connection:abort', (info) => {
      this.makeConnection(info);
    });

    this.plumber.on('connection:detach', (info) => {
      // console.log('Connection detached', info);
      this.makeConnection(info);
    });
  }

  private makeConnection(info) {
    if (this.sourceId && this.targetId && this.isValidTarget) {
      // going to the same target, just put it back
      if (info.target.id === this.targetId) {
        this.plumber.connectIds(
          this.dragFromNodeId,
          this.sourceId,
          this.targetId
        );
      }
      // otherwise update the connection
      else {
        getStore()
          .getState()
          .updateConnection(this.dragFromNodeId, this.sourceId, this.targetId);
      }
    } else if (
      this.connectionPlaceholder &&
      this.connectionPlaceholder.visible &&
      this.sourceId
    ) {
      // Snap the placeholder position to grid
      const snappedPosition = {
        left: snapToGrid(this.connectionPlaceholder.position.left),
        top: snapToGrid(this.connectionPlaceholder.position.top)
      };
      const isDragUp = !!this.connectionPlaceholder.dragUp;

      // Update the placeholder to the snapped position
      this.connectionPlaceholder.position = snappedPosition;

      // Store the pending connection info
      this.pendingCanvasConnection = {
        fromNodeId: this.dragFromNodeId,
        exitId: this.sourceId,
        position: snappedPosition
      };

      // Show the context menu near the placeholder
      const canvas = this.querySelector('#canvas');
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const menuX = canvasRect.left + snappedPosition.left * this.zoom - 40;
        const menuY = isDragUp
          ? canvasRect.top + snappedPosition.top * this.zoom + 74 // just below placeholder bottom
          : canvasRect.top + snappedPosition.top * this.zoom + 80; // just below placeholder

        const canvasMenu = this.querySelector(
          'temba-canvas-menu'
        ) as CanvasMenu;
        if (canvasMenu) {
          canvasMenu.show(
            menuX,
            menuY,
            {
              x: snappedPosition.left,
              y: snappedPosition.top
            },
            false
          ); // Don't show sticky note option for connection drops
        }
      }

      // Request update to render the connection line
      this.requestUpdate();

      // Don't clear placeholder or connection info yet - keep them for menu interaction
      return;
    }

    // Clean up visual feedback
    document.querySelectorAll('temba-flow-node').forEach((node) => {
      node.classList.remove(
        'connection-target-valid',
        'connection-target-invalid'
      );
    });

    // Clear connection state (but keep sourceId/dragFromNodeId if we have a pending connection)
    if (!this.pendingCanvasConnection) {
      this.sourceId = null;
      this.connectionSourceX = null;
      this.connectionSourceY = null;
      this.dragFromNodeId = null;
    }
    this.targetId = null;
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

      // Start fetching activity data when definition is loaded
      if (this.definition?.uuid) {
        this.startActivityFetching();
      }
    }

    if (changes.has('simulatorActive')) {
      if (this.simulatorActive) {
        // Stop polling when simulator becomes active
        this.stopActivityFetching();
      } else {
        // Resume polling and refresh activity when simulator closes
        this.activityInterval = 100; // Reset to fast initial interval
        this.startActivityFetching();
      }
    }

    if (changes.has('activityData')) {
      // Update plumber with new activity data
      if (this.plumber) {
        this.plumber.setActivityData(this.activityData);
      }
    }

    if (changes.has('dirtyDate')) {
      if (this.dirtyDate) {
        if (this.reflowPending) {
          // This dirtyDate is from the reflow itself — suppress save
          this.reflowPending = false;
        } else {
          // Normal change — if reflow card was showing, it goes away
          // because these changes will be included in the save
          if (this.reflowUnsaved) {
            this.reflowUnsaved = false;
            this.savedReflowPositions = null;
          }
          this.isSaving = true;
          this.debouncedSave();
        }
      }
    }

    if (changes.has('saveError') && this.saveError) {
      this.showSaveErrorDialog(this.saveError);
      this.saveError = null;
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
      // Don't auto-save while a reflow preview is pending user confirmation
      if (this.reflowUnsaved) {
        this.saveTimer = null;
        return;
      }

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

  private definitionForSave(definition: FlowDefinition): FlowDefinition {
    return {
      ...definition,
      _ui: {
        ...definition._ui,
        editor: TEMBA_COMPONENTS_VERSION
      }
    };
  }

  private saveChanges(definitionOverride?: FlowDefinition): Promise<void> {
    const definition = this.definitionForSave(
      definitionOverride || this.definition
    );
    this.isSaving = true;

    return getStore()
      .postJSON(`/flow/revisions/${this.flow}/`, definition)
      .then((response) => {
        if (response.status < 200 || response.status >= 300) {
          this.saveError = this.extractErrorMessage(response);
          return;
        }

        // Update flow info and revision with the response data
        if (response.json) {
          const state = getStore().getState();

          if (response.json.info) {
            state.setFlowInfo(response.json.info);
          }

          if (response.json.revision?.revision !== undefined) {
            state.setRevision(response.json.revision.revision);
          }

          // Refresh revisions list so the tab visibility stays up to date
          this.fetchRevisions();
        }

        getStore().getState().setDirtyDate(null);
      })
      .catch((error) => {
        console.error('Failed to save flow:', error);
        if (error instanceof Response) {
          this.saveError = `Server error (${error.status}). Your changes have not been saved.`;
        } else {
          this.saveError =
            'Unable to reach the server. Please check your connection and try again.';
        }
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  private extractErrorMessage(response: WebResponse): string {
    if (response.json) {
      if (typeof response.json.detail === 'string') {
        return response.json.detail;
      }
      if (typeof response.json.error === 'string') {
        return response.json.error;
      }
      if (typeof response.json.description === 'string') {
        return response.json.description;
      }
    }
    return `Save failed with status ${response.status}.`;
  }

  private showSaveErrorDialog(message: string): void {
    const dialog = document.createElement('temba-dialog') as Dialog;
    dialog.header = 'Save Failed';
    dialog.primaryButtonName = '';
    dialog.cancelButtonName = 'Dismiss';

    const content = document.createElement('div');
    content.style.cssText = 'padding: 20px; font-size: 14px; line-height: 1.5;';
    content.textContent = message;
    dialog.appendChild(content);

    document.body.appendChild(dialog);
    dialog.open = true;

    dialog.addEventListener('temba-dialog-hidden', () => {
      document.body.removeChild(dialog);
    });
  }

  private startActivityFetching(): void {
    // Don't start if simulator is active
    if (this.simulatorActive) {
      return;
    }
    // Fetch immediately
    this.fetchActivityData();
  }

  private stopActivityFetching(): void {
    if (this.activityTimer !== null) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  private fetchActivityData(): void {
    if (!this.definition?.uuid) {
      return;
    }

    // Don't fetch if simulator is active
    if (this.simulatorActive) {
      return;
    }

    const activityEndpoint = `/flow/activity/${this.definition.uuid}/`;
    const store = getStore();
    if (!store) {
      return;
    }
    const state = store.getState();
    state.fetchActivity(activityEndpoint).then(() => {
      // Guard against responses arriving after the editor is disconnected
      if (!this.isConnected) {
        return;
      }

      // Schedule next fetch with exponential backoff (max 5 minutes)
      this.activityInterval = Math.min(60000 * 5, this.activityInterval + 100);

      if (this.activityTimer !== null) {
        clearTimeout(this.activityTimer);
      }

      this.activityTimer = window.setTimeout(() => {
        this.fetchActivityData();
      }, this.activityInterval);
    });
  }

  private handleLanguageChange(languageCode: string): void {
    zustand.getState().setLanguageCode(languageCode);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopAutoScroll();
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.activityTimer !== null) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('mousedown', this.boundGlobalMouseDown);
    document.removeEventListener('keydown', this.boundKeyDown);

    const canvas = this.querySelector('#canvas');
    if (canvas) {
      canvas.removeEventListener('contextmenu', this.boundCanvasContextMenu);
    }

    const editor = this.querySelector('#editor');
    if (editor) {
      editor.removeEventListener('wheel', this.boundWheel);
    }

    // Clear all flow-specific data from the store so stale data
    // isn't briefly visible when a different flow is opened.
    zustand.getState().clearFlowData();
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

    const editor = this.querySelector('#editor');
    if (editor) {
      editor.addEventListener('wheel', this.boundWheel, { passive: false });
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

    // Listen for canvas menu cancel (close without selection)
    this.addEventListener(CustomEventType.Canceled, (event: CustomEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'TEMBA-CANVAS-MENU') {
        this.handleCanvasMenuClosed();
      } else if (target.tagName === 'TEMBA-NODE-TYPE-SELECTOR') {
        this.handleNodeTypeSelectorClosed();
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
    if (isRightClick(event)) return;

    if (this.isReadOnly()) return;
    this.blurActiveContentEditable();

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
    if (isRightClick(event)) return;

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

  private blurActiveContentEditable(): void {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    if (
      active instanceof HTMLElement &&
      active.getAttribute('contenteditable') === 'true'
    ) {
      active.blur();
    }
  }

  private handleCanvasMouseDown(event: MouseEvent): void {
    if (this.isReadOnly()) return;
    this.blurActiveContentEditable();

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

        const relativeX = (event.clientX - canvasRect.left) / this.zoom;
        const relativeY = (event.clientY - canvasRect.top) / this.zoom;

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

  // --- Zoom ---

  private setZoom(
    newZoom: number,
    center?: { clientX: number; clientY: number }
  ): void {
    const clamped = Math.max(
      0.1,
      Math.min(1.0, Math.round(newZoom * 100) / 100)
    );
    if (clamped === this.zoom) return;

    const editor = this.querySelector('#editor') as HTMLElement;
    const oldZoom = this.zoom;
    this.zoom = clamped;
    this.plumber.zoom = clamped;
    this.zoomFitted = false;

    if (editor && center) {
      const editorRect = editor.getBoundingClientRect();
      const ox = center.clientX - editorRect.left;
      const oy = center.clientY - editorRect.top;
      // Canvas point under cursor at old zoom
      const cx = (editor.scrollLeft + ox) / oldZoom;
      const cy = (editor.scrollTop + oy) / oldZoom;

      requestAnimationFrame(() => {
        editor.scrollLeft = cx * clamped - ox;
        editor.scrollTop = cy * clamped - oy;
        this.plumber.repaintEverything();
      });
    } else {
      requestAnimationFrame(() => this.plumber.repaintEverything());
    }
  }

  private zoomIn(): void {
    this.setZoom(this.zoom + 0.05);
  }

  private zoomOut(): void {
    this.setZoom(this.zoom - 0.05);
  }

  private zoomToFit(): void {
    if (!this.definition || this.definition.nodes.length === 0) return;

    const editor = this.querySelector('#editor') as HTMLElement;
    if (!editor) return;

    // Calculate bounding box of all content in canvas coordinates
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.definition.nodes.forEach((node) => {
      const ui = this.definition._ui?.nodes[node.uuid];
      if (!ui?.position) return;
      const el = this.querySelector(`[id="${node.uuid}"]`) as HTMLElement;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      minX = Math.min(minX, ui.position.left);
      minY = Math.min(minY, ui.position.top);
      maxX = Math.max(maxX, ui.position.left + w);
      maxY = Math.max(maxY, ui.position.top + h);
    });

    const stickies = this.definition._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (!sticky.position) return;
      const el = this.querySelector(
        `temba-sticky-note[uuid="${uuid}"]`
      ) as HTMLElement;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      minX = Math.min(minX, sticky.position.left);
      minY = Math.min(minY, sticky.position.top);
      maxX = Math.max(maxX, sticky.position.left + w);
      maxY = Math.max(maxY, sticky.position.top + h);
    });

    if (minX === Infinity) return;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 40;

    const availWidth = editor.clientWidth - padding * 2;
    const availHeight = editor.clientHeight - padding * 2;

    const scaleX = availWidth / contentWidth;
    const scaleY = availHeight / contentHeight;
    let fitZoom = Math.min(scaleX, scaleY, 1.0);
    fitZoom = Math.max(fitZoom, 0.1);
    fitZoom = Math.round(fitZoom * 20) / 20; // round to nearest 0.05

    this.zoom = fitZoom;
    this.plumber.zoom = fitZoom;
    this.zoomFitted = true;

    // Center of content in canvas coordinates, plus grid/canvas margin offset
    const centerX = (minX + maxX) / 2 + 40;
    const centerY = (minY + maxY) / 2 + 40;

    requestAnimationFrame(() => {
      editor.scrollLeft = centerX * fitZoom - editor.clientWidth / 2;
      editor.scrollTop = centerY * fitZoom - editor.clientHeight / 2;
      this.plumber.repaintEverything();
    });
  }

  private zoomToFull(): void {
    this.setZoom(1.0);
  }

  /** Adjust zoom control right offset and floating tab positions */
  private updateZoomControlPositioning(): void {
    requestAnimationFrame(() => {
      const editor = this.querySelector('#editor') as HTMLElement;
      const zoomControls = this.querySelector('.zoom-controls') as HTMLElement;
      if (editor && zoomControls) {
        // Match right spacing to the top spacing (8px) by accounting for
        // the scrollbar width
        const scrollbarWidth = editor.offsetWidth - editor.clientWidth;
        zoomControls.style.right = `${8 + scrollbarWidth}px`;
      }
      if (zoomControls) {
        const rect = zoomControls.getBoundingClientRect();
        FloatingTab.START_TOP = rect.bottom + 8;
        FloatingTab.updateAllPositions();
      }
    });
  }

  private handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();

    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    this.setZoom(this.zoom + delta, {
      clientX: event.clientX,
      clientY: event.clientY
    });
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

  private performReflow(): void {
    if (!this.definition || this.definition.nodes.length === 0) return;

    // Save current positions for discard (nodes + stickies)
    const savedPositions: Record<string, FlowPosition> = {};
    for (const node of this.definition.nodes) {
      const ui = this.definition._ui?.nodes[node.uuid];
      if (ui?.position) {
        savedPositions[node.uuid] = { ...ui.position };
      }
    }
    const stickies = this.definition._ui?.stickies || {};
    for (const [uuid, sticky] of Object.entries(stickies)) {
      if (sticky.position) {
        savedPositions[uuid] = { ...sticky.position };
      }
    }
    this.savedReflowPositions = savedPositions;

    // Save old node positions before reflow for sticky proximity calculation
    const oldNodePositions: Record<string, FlowPosition> = {};
    for (const node of this.definition.nodes) {
      const ui = this.definition._ui?.nodes[node.uuid];
      if (ui?.position) {
        oldNodePositions[node.uuid] = { ...ui.position };
      }
    }

    // Identify start node (first in sorted array)
    const startNodeUuid = this.definition.nodes[0].uuid;

    // Gather node sizes from DOM
    const nodeSizes = new Map<string, { width: number; height: number }>();
    const getNodeSize = (uuid: string): { width: number; height: number } => {
      const element = this.querySelector(`[id="${uuid}"]`) as HTMLElement;
      if (element) {
        const size = {
          width: element.offsetWidth,
          height: element.offsetHeight
        };
        nodeSizes.set(uuid, size);
        return size;
      }
      const fallback = { width: 200, height: 100 };
      nodeSizes.set(uuid, fallback);
      return fallback;
    };

    // Compute new layout
    const newPositions = calculateLayeredLayout(
      this.definition.nodes,
      this.definition._ui.nodes,
      startNodeUuid,
      getNodeSize
    );

    // Place sticky notes next to their closest nodes
    if (Object.keys(stickies).length > 0) {
      const stickySizes = new Map<string, { width: number; height: number }>();
      for (const uuid of Object.keys(stickies)) {
        const el = this.querySelector(
          `temba-sticky-note[uuid="${uuid}"]`
        ) as HTMLElement;
        if (el) {
          stickySizes.set(uuid, {
            width: el.offsetWidth,
            height: el.offsetHeight
          });
        } else {
          stickySizes.set(uuid, { width: 182, height: 100 });
        }
      }

      const stickyPositions = placeStickyNotes(
        stickies,
        oldNodePositions,
        newPositions,
        nodeSizes,
        stickySizes,
        startNodeUuid
      );

      // Merge sticky positions into newPositions
      Object.assign(newPositions, stickyPositions);
    }

    // Cancel any in-flight save timer so it doesn't persist the reflowed
    // layout before the user has a chance to Save or Discard.
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    // Suppress the auto-save from this updateCanvasPositions call
    this.reflowPending = true;
    this.reflowUnsaved = true;

    // Apply new positions
    getStore().getState().updateCanvasPositions(newPositions);

    // Update canvas size and repaint connections
    this.updateCanvasSize();
    requestAnimationFrame(() => {
      this.plumber.repaintEverything();
    });

    // Scroll to top-left so the start node is visible
    const editor = this.querySelector('#editor') as HTMLElement;
    if (editor) {
      editor.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
  }

  private handleReflowSave(): void {
    this.reflowUnsaved = false;
    this.savedReflowPositions = null;
    this.saveChanges();
  }

  private handleReflowDiscard(): void {
    this.reflowUnsaved = false;

    if (this.savedReflowPositions) {
      // Cancel any pending save timer before reverting
      if (this.saveTimer !== null) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }

      // Suppress the auto-save from reverting positions
      this.reflowPending = true;
      getStore().getState().updateCanvasPositions(this.savedReflowPositions);
      this.savedReflowPositions = null;

      // Clear dirty state since we reverted to the saved version
      setTimeout(() => {
        getStore().getState().setDirtyDate(null);
        this.isSaving = false;
      }, 0);

      requestAnimationFrame(() => {
        this.plumber.repaintEverything();
      });
    }
  }

  private deleteNodes(uuids: string[]): void {
    // Remove nodes from the definition - CanvasNode will handle plumber cleanup
    if (uuids.length > 0) {
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

    const relativeX = (event.clientX - canvasRect.left) / this.zoom;
    const relativeY = (event.clientY - canvasRect.top) / this.zoom;

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
      const nodeElement = this.querySelector(
        `[id="${node.uuid}"]`
      ) as HTMLElement;
      if (nodeElement) {
        const position = this.definition._ui?.nodes[node.uuid]?.position;
        if (position) {
          const canvasRect =
            this.querySelector('#canvas')?.getBoundingClientRect();

          if (canvasRect) {
            const nodeLeft = position.left;
            const nodeTop = position.top;
            const nodeRight = nodeLeft + nodeElement.offsetWidth;
            const nodeBottom = nodeTop + nodeElement.offsetHeight;

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

  private renderConnectionPlaceholder(): TemplateResult | string {
    if (!this.connectionPlaceholder || !this.connectionPlaceholder.visible)
      return '';

    const { position, dragUp } = this.connectionPlaceholder;

    // Render connection line when we have a pending connection (after drop)
    let svgPath = null;
    if (
      this.sourceId &&
      this.dragFromNodeId &&
      this.pendingCanvasConnection &&
      this.connectionSourceX != null &&
      this.connectionSourceY != null
    ) {
      const sourceX = this.connectionSourceX;
      const sourceY = this.connectionSourceY;
      const targetX = position.left + 100;
      // When dragging up, connect to the placeholder bottom; otherwise to the top
      const targetY = dragUp ? position.top + 64 : position.top;

      const routeFace: 'top' | 'left' | 'right' = dragUp
        ? targetX < sourceX
          ? 'left'
          : 'right'
        : 'top';

      const pathData = calculateFlowchartPath(
        sourceX,
        sourceY,
        targetX,
        targetY,
        20,
        dragUp ? 0 : 10,
        5,
        routeFace
      );

      const aw = ARROW_HALF_WIDTH;
      const al = ARROW_LENGTH;
      let arrowPoints: string;
      if (dragUp) {
        // Arrow tip pointing up, base at placeholder bottom
        arrowPoints = `${targetX},${targetY - al} ${targetX - aw},${targetY} ${
          targetX + aw
        },${targetY}`;
      } else {
        // Arrow pointing down into top of placeholder
        arrowPoints = `${targetX},${targetY} ${targetX - aw},${targetY - al} ${
          targetX + aw
        },${targetY - al}`;
      }

      svgPath = html`
        <svg
          style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;"
        >
          <path
            d="${pathData}"
            fill="none"
            stroke="var(--color-connectors, #ccc)"
            stroke-width="3"
          />
          <polygon
            points="${arrowPoints}"
            fill="var(--color-connectors, #ccc)"
          />
        </svg>
      `;
    }

    return html`${svgPath}
      <div
        class="connection-placeholder"
        style="position: absolute; left: ${position.left}px; top: ${position.top}px; opacity: 0.6; pointer-events: none; z-index: 10000;"
      >
        <div
          class="node execute-actions"
          style="outline: 3px dashed var(--color-primary, #3b82f6); outline-offset: 2px; border-radius: var(--curvature); min-width: 200px;"
        >
          <div class="empty-node-placeholder" style="height: 60px;"></div>
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
   * Sacred nodes (just moved/dropped) keep their positions while
   * other nodes are moved in the least-disruptive direction.
   */
  private checkCollisionsAndReflow(sacredNodeUuids: string[]): void {
    if (!this.definition) return;

    const allBounds: NodeBounds[] = [];
    for (const node of this.definition.nodes) {
      const nodeUI = this.definition._ui?.nodes[node.uuid];
      if (!nodeUI?.position) continue;

      const bounds = getNodeBounds(node.uuid, nodeUI.position);
      if (bounds) {
        allBounds.push(bounds);
      }
    }

    const reflowPositions = calculateReflowPositions(
      sacredNodeUuids,
      allBounds
    );

    if (reflowPositions.size > 0) {
      const positions: { [uuid: string]: FlowPosition } = {};
      for (const [uuid, position] of reflowPositions.entries()) {
        positions[uuid] = position;
      }
      getStore().getState().updateCanvasPositions(positions);
    }
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

        // Hide connection placeholder when over a node
        this.connectionPlaceholder = null;
      } else {
        this.targetId = null;
        this.isValidTarget = true;

        // Show connection placeholder when over empty canvas
        const canvas = this.querySelector('#canvas');
        if (canvas) {
          const canvasRect = canvas.getBoundingClientRect();
          const relativeX = (event.clientX - canvasRect.left) / this.zoom;
          const relativeY = (event.clientY - canvasRect.top) / this.zoom;

          const placeholderWidth = 200;
          const placeholderHeight = 64;
          const arrowLength = ARROW_LENGTH;
          const cursorGap = CURSOR_GAP;

          // Determine if cursor is above the source exit using stored sourceY
          const dragUp =
            this.connectionSourceY != null
              ? relativeY < this.connectionSourceY
              : false;

          let top: number;
          if (dragUp) {
            // Arrow points up: tip at cy + cursorGap.
            // Placeholder bottom should sit just above the arrow tip.
            top = relativeY + cursorGap - placeholderHeight;
          } else {
            // Arrow points down: tip at cy - cursorGap + arrowLength.
            // Placeholder top sits just below the arrow tip.
            top = relativeY - cursorGap + arrowLength;
          }

          this.connectionPlaceholder = {
            position: {
              left: relativeX - placeholderWidth / 2,
              top
            },
            visible: true,
            dragUp
          };
        }
      }

      // Force update to show/hide placeholder
      this.requestUpdate();
    }

    // Handle item dragging
    if (!this.isMouseDown || !this.currentDragItem) return;

    this.lastMouseEvent = event;

    const deltaX = event.clientX - this.dragStartPos.x + this.autoScrollDeltaX;
    const deltaY = event.clientY - this.dragStartPos.y + this.autoScrollDeltaY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only start dragging if we've moved beyond the threshold
    if (!this.isDragging && distance > DRAG_THRESHOLD) {
      this.isDragging = true;
      this.startAutoScroll();
    }

    // If we're actually dragging, update positions
    if (this.isDragging) {
      this.updateDragPositions();
    }
  }

  private updateDragPositions(): void {
    if (!this.currentDragItem || !this.lastMouseEvent) return;

    // Convert screen + scroll delta to canvas delta
    const deltaX =
      (this.lastMouseEvent.clientX -
        this.dragStartPos.x +
        this.autoScrollDeltaX) /
      this.zoom;
    const deltaY =
      (this.lastMouseEvent.clientY -
        this.dragStartPos.y +
        this.autoScrollDeltaY) /
      this.zoom;

    const itemsToMove =
      this.selectedItems.has(this.currentDragItem.uuid) &&
      this.selectedItems.size > 1
        ? Array.from(this.selectedItems)
        : [this.currentDragItem.uuid];

    itemsToMove.forEach((uuid) => {
      const element = this.querySelector(`[uuid="${uuid}"]`) as HTMLElement;
      if (element) {
        const type = element.tagName === 'TEMBA-FLOW-NODE' ? 'node' : 'sticky';
        const position = this.getPosition(uuid, type);

        if (position) {
          element.style.left = `${position.left + deltaX}px`;
          element.style.top = `${position.top + deltaY}px`;
          element.classList.add('dragging');
        }
      }
    });

    this.plumber.revalidate(itemsToMove);
  }

  private startAutoScroll(): void {
    if (this.autoScrollAnimationId !== null) return;

    const editor = this.querySelector('#editor') as HTMLElement;
    if (!editor) return;

    const tick = () => {
      if (!this.isDragging || !this.lastMouseEvent) {
        this.autoScrollAnimationId = null;
        return;
      }

      const editorRect = editor.getBoundingClientRect();
      const mouseX = this.lastMouseEvent.clientX;
      const mouseY = this.lastMouseEvent.clientY;

      let scrollDx = 0;
      let scrollDy = 0;

      // Left edge
      const distFromLeft = mouseX - editorRect.left;
      if (distFromLeft >= 0 && distFromLeft < AUTO_SCROLL_EDGE_ZONE) {
        const ratio = 1 - distFromLeft / AUTO_SCROLL_EDGE_ZONE;
        scrollDx = -(ratio * AUTO_SCROLL_MAX_SPEED);
      }

      // Right edge
      const distFromRight = editorRect.right - mouseX;
      if (distFromRight >= 0 && distFromRight < AUTO_SCROLL_EDGE_ZONE) {
        const ratio = 1 - distFromRight / AUTO_SCROLL_EDGE_ZONE;
        scrollDx = ratio * AUTO_SCROLL_MAX_SPEED;
      }

      // Top edge
      const distFromTop = mouseY - editorRect.top;
      if (distFromTop >= 0 && distFromTop < AUTO_SCROLL_EDGE_ZONE) {
        const ratio = 1 - distFromTop / AUTO_SCROLL_EDGE_ZONE;
        scrollDy = -(ratio * AUTO_SCROLL_MAX_SPEED);
      }

      // Bottom edge
      const distFromBottom = editorRect.bottom - mouseY;
      if (distFromBottom >= 0 && distFromBottom < AUTO_SCROLL_EDGE_ZONE) {
        const ratio = 1 - distFromBottom / AUTO_SCROLL_EDGE_ZONE;
        scrollDy = ratio * AUTO_SCROLL_MAX_SPEED;
      }

      if (scrollDx !== 0 || scrollDy !== 0) {
        const beforeScrollLeft = editor.scrollLeft;
        const beforeScrollTop = editor.scrollTop;

        // Expand canvas if scrolling toward bottom/right edges
        // Convert from scroll space to canvas space for expandCanvas
        if (scrollDx > 0 || scrollDy > 0) {
          const neededWidth =
            (editor.scrollLeft + editor.clientWidth + scrollDx) / this.zoom;
          const neededHeight =
            (editor.scrollTop + editor.clientHeight + scrollDy) / this.zoom;
          getStore().getState().expandCanvas(neededWidth, neededHeight);
        }

        editor.scrollLeft += scrollDx;
        editor.scrollTop += scrollDy;

        // Track actual scroll delta (browser clamps at boundaries)
        const actualDx = editor.scrollLeft - beforeScrollLeft;
        const actualDy = editor.scrollTop - beforeScrollTop;
        this.autoScrollDeltaX += actualDx;
        this.autoScrollDeltaY += actualDy;

        if (actualDx !== 0 || actualDy !== 0) {
          this.updateDragPositions();
        }
      }

      this.autoScrollAnimationId = requestAnimationFrame(tick);
    };

    this.autoScrollAnimationId = requestAnimationFrame(tick);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollAnimationId !== null) {
      cancelAnimationFrame(this.autoScrollAnimationId);
      this.autoScrollAnimationId = null;
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

    this.stopAutoScroll();

    // If we were actually dragging, handle the drag end
    if (this.isDragging) {
      // Convert screen + scroll delta to canvas delta
      const deltaX =
        (event.clientX - this.dragStartPos.x + this.autoScrollDeltaX) /
        this.zoom;
      const deltaY =
        (event.clientY - this.dragStartPos.y + this.autoScrollDeltaY) /
        this.zoom;

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
            this.checkCollisionsAndReflow(nodeUuids);
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
    this.autoScrollDeltaX = 0;
    this.autoScrollDeltaY = 0;
    this.lastMouseEvent = null;
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
        const nodeElement = this.querySelector(
          `[id="${node.uuid}"]`
        ) as HTMLElement;
        if (nodeElement) {
          // Use offsetWidth/offsetHeight (unaffected by ancestor transforms)
          maxWidth = Math.max(
            maxWidth,
            ui.position.left + nodeElement.offsetWidth
          );
          maxHeight = Math.max(
            maxHeight,
            ui.position.top + nodeElement.offsetHeight
          );
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
    if (this.isReadOnly()) {
      event.preventDefault();
      return;
    }

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
    const relativeX = (event.clientX - canvasRect.left) / this.zoom - 10;
    const relativeY = (event.clientY - canvasRect.top) / this.zoom - 10;

    // Snap position to grid
    const snappedLeft = snapToGrid(relativeX);
    const snappedTop = snapToGrid(relativeY);

    // Show the canvas menu at the mouse position (use viewport coordinates)
    const canvasMenu = this.querySelector('temba-canvas-menu') as CanvasMenu;
    if (canvasMenu) {
      const hasNodes = this.definition && this.definition.nodes.length > 0;
      canvasMenu.show(
        event.clientX,
        event.clientY,
        {
          x: snappedLeft,
          y: snappedTop
        },
        true,
        hasNodes
      );
    }
  }

  private handleEmptyFlowClick(event: MouseEvent): void {
    const editor = this.querySelector('#editor') as HTMLElement;
    if (!editor) return;

    // Scroll to top-left
    editor.scrollTo({ left: 0, top: 0, behavior: 'smooth' });

    // Place node at top-left of the canvas
    const nodeLeft = 0;
    const nodeTop = 0;

    const canvasMenu = this.querySelector('temba-canvas-menu') as CanvasMenu;
    if (canvasMenu) {
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      const menuWidth = 265;
      const menuX = rect.left + rect.width / 2 - menuWidth / 2;
      const menuY = rect.bottom + 8;
      canvasMenu.show(menuX, menuY, { x: nodeLeft, y: nodeTop }, false);
    }
  }

  private handleCanvasMenuSelection(event: CustomEvent): void {
    const selection = event.detail as CanvasMenuSelection;
    const store = getStore();

    if (selection.action === 'reflow') {
      this.performReflow();
      return;
    }

    if (selection.action === 'sticky') {
      // Create new sticky note
      store.getState().createStickyNote({
        left: selection.position.x,
        top: selection.position.y
      });
      // Clear all pending connection state and placeholder
      this.pendingCanvasConnection = null;
      this.connectionPlaceholder = null;
      this.sourceId = null;
      this.connectionSourceX = null;
      this.connectionSourceY = null;
      this.dragFromNodeId = null;
    } else {
      // Show node type selector
      const selector = this.querySelector(
        'temba-node-type-selector'
      ) as NodeTypeSelector;
      if (selector) {
        selector.show(selection.action, selection.position);
      }
      // Note: we don't clear pendingCanvasConnection or placeholder here,
      // they will be used in handleNodeTypeSelection
    }
  }

  private cleanUpConnection(): void {
    if (this.isCreatingNewNode) {
      this.isCreatingNewNode = false;
      this.pendingNodePosition = null;
    }

    // see if we need to put our connection back
    if (this.originalConnectionTargetId) {
      this.plumber.connectIds(
        this.dragFromNodeId,
        this.sourceId,
        this.originalConnectionTargetId
      );
      this.originalConnectionTargetId = null;
    }

    // Menu closed without selection - clear placeholder and pending connection
    if (this.pendingCanvasConnection) {
      this.pendingCanvasConnection = null;
      this.connectionPlaceholder = null;
      this.sourceId = null;
      this.connectionSourceX = null;
      this.connectionSourceY = null;
      this.dragFromNodeId = null;
      this.originalConnectionTargetId = null;
    }
  }

  private handleCanvasMenuClosed(): void {
    this.cleanUpConnection();
  }

  private handleNodeTypeSelectorClosed(): void {
    this.cleanUpConnection();
  }

  private handleNodeTypeSelection(event: CustomEvent): void {
    const selection = event.detail as NodeTypeSelection;

    // Check if we have a pending canvas connection (from dropping on empty canvas)
    if (this.pendingCanvasConnection) {
      // Don't clear the placeholder yet - keep it visible while editing
      // The position is already stored in pendingCanvasConnection
      // Fall through to normal node creation flow below
    }

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
      position: this.pendingCanvasConnection
        ? this.pendingCanvasConnection.position
        : {
            left: selection.position.x,
            top: selection.position.y
          },
      type: nodeType as any,
      config: {}
    };

    // Mark that we're creating a new node and store the position
    this.isCreatingNewNode = true;
    this.pendingNodePosition = this.pendingCanvasConnection
      ? this.pendingCanvasConnection.position
      : {
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
    this.dialogOrigin =
      event.detail.originX != null
        ? { x: event.detail.originX, y: event.detail.originY }
        : null;

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
    this.dialogOrigin =
      event.detail.originX != null
        ? { x: event.detail.originX, y: event.detail.originY }
        : null;
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

        // If we have a pending canvas connection, connect it to this new node
        if (this.pendingCanvasConnection) {
          store
            .getState()
            .updateConnection(
              this.pendingCanvasConnection.fromNodeId,
              this.pendingCanvasConnection.exitId,
              updatedNode.uuid
            );

          // Clear the pending connection and placeholder
          this.pendingCanvasConnection = null;
          this.connectionPlaceholder = null;
          this.sourceId = null;
          this.connectionSourceX = null;
          this.connectionSourceY = null;
          this.dragFromNodeId = null;
        }

        // Reset the creation flags
        this.isCreatingNewNode = false;
        this.pendingNodePosition = null;

        // Check for collisions and reflow
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([updatedNode.uuid]);
        });
      } else {
        const uuid = this.editingNode.uuid;
        // Update existing node in the store
        getStore()?.getState().updateNode(uuid, updatedNode);

        // Check for collisions and reflow in case node size changed
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([uuid]);
        });
      }
    }
    this.closeNodeEditor();
  }

  private closeNodeEditor(): void {
    this.editingNode = null;
    this.editingNodeUI = null;
    this.editingAction = null;
    this.dialogOrigin = null;
  }

  private handleActionEditCanceled(): void {
    // If we were creating a new node, just discard it
    this.cleanUpConnection();
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

        // If we have a pending canvas connection, connect it to this new node
        if (this.pendingCanvasConnection) {
          store
            .getState()
            .updateConnection(
              this.pendingCanvasConnection.fromNodeId,
              this.pendingCanvasConnection.exitId,
              updatedNode.uuid
            );

          // Clear the pending connection and placeholder
          this.pendingCanvasConnection = null;
          this.connectionPlaceholder = null;
          this.sourceId = null;
          this.connectionSourceX = null;
          this.connectionSourceY = null;
          this.dragFromNodeId = null;
        }

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
        const nodeUuid = updatedNode.uuid;
        requestAnimationFrame(() => {
          this.checkCollisionsAndReflow([nodeUuid]);
        });
      }
    }
    this.closeNodeEditor();
  }

  private handleNodeEditCanceled(): void {
    this.cleanUpConnection();
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

    // Convert viewport coordinates to canvas coordinates, accounting for zoom
    const left = (mouseX - canvasRect.left) / this.zoom - DROP_PREVIEW_OFFSET_X;
    const top = (mouseY - canvasRect.top) / this.zoom - DROP_PREVIEW_OFFSET_Y;

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
      // Use deleteNodes to properly clean up Plumber connections before removing
      this.deleteNodes([nodeUuid]);
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
      node.actions?.forEach((action) => {
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
    this.revisionsWindowHidden = true;
    this.issuesWindowHidden = true;

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

  private handleIssuesTabClick(): void {
    this.issuesWindowHidden = false;
    this.revisionsWindowHidden = true;
    this.localizationWindowHidden = true;
  }

  private handleIssuesWindowClosed(): void {
    this.issuesWindowHidden = true;
  }

  private handleIssueItemClick(issue: FlowIssue): void {
    const issuesWindow = document.getElementById(
      'issues-window'
    ) as FloatingWindow;
    issuesWindow?.handleClose();
    this.issuesWindowHidden = true;

    this.focusNode(issue.node_uuid);

    const node = this.definition.nodes.find((n) => n.uuid === issue.node_uuid);
    if (!node) return;

    if (issue.action_uuid) {
      const action = node.actions?.find((a) => a.uuid === issue.action_uuid);
      if (action) {
        this.editingAction = action;
        this.editingNode = node;
        this.editingNodeUI = this.definition._ui.nodes[issue.node_uuid];
      }
    } else {
      this.editingNode = node;
      this.editingNodeUI = this.definition._ui.nodes[issue.node_uuid];
    }
  }

  private handleRevisionsTabClick(): void {
    if (this.revisionsWindowHidden) {
      this.fetchRevisions();
      this.revisionsWindowHidden = false;
      this.issuesWindowHidden = true;
      this.localizationWindowHidden = true;
    }
  }

  private handleRevisionsWindowClosed(): void {
    this.resetRevisionsScroll();
    this.revisionsWindowHidden = true;
    if (this.viewingRevision) {
      this.handleCancelRevisionView();
    }
  }

  private resetRevisionsScroll() {
    const list =
      this.querySelector('#revisions-window').shadowRoot?.querySelector(
        '.body'
      );
    if (list) {
      list.scrollTop = 0;
    }
  }

  private async fetchRevisions() {
    this.isLoadingRevisions = true;
    try {
      const results = await fetchResults(
        `/flow/revisions/${this.flow}/?version=${FLOW_SPEC_VERSION}`
      );
      this.revisions = results.slice(1);
    } catch (e) {
      console.error('Error fetching revisions', e);
    } finally {
      this.isLoadingRevisions = false;
    }
  }

  private async handleRevisionClick(revision: Revision) {
    if (this.viewingRevision?.id === revision.id) {
      return;
    }

    if (!this.viewingRevision) {
      // Save current state first
      this.preRevertState = {
        definition: this.definition,
        dirtyDate: this.dirtyDate
      };
    }

    this.viewingRevision = revision;
    this.isLoadingRevisions = true;
    this.plumber?.reset();

    try {
      await getStore()
        .getState()
        .fetchRevision(`/flow/revisions/${this.flow}`, revision.id.toString());
    } catch (e) {
      console.error('Error fetching revision details', e);
      this.handleCancelRevisionView();
    } finally {
      this.isLoadingRevisions = false;
    }
  }

  private handleCancelRevisionView() {
    this.plumber?.reset();
    if (this.preRevertState) {
      const currentInfo = getStore().getState().flowInfo;
      getStore().getState().setFlowContents({
        definition: this.preRevertState.definition,
        info: currentInfo
      });
      if (this.preRevertState.dirtyDate) {
        getStore().getState().setDirtyDate(this.preRevertState.dirtyDate);
      }
    } else {
      // Fallback if no pre-revert definition
      getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
    }

    this.viewingRevision = null;
    this.preRevertState = null;
  }

  private async handleRevertClick() {
    if (!this.viewingRevision || !this.preRevertState) return;
    this.plumber?.reset();

    // Use the content of the viewing revision (this.definition)
    // but the revision number of the current head (preRevertState)
    // so the server accepts it as a valid update
    const definitionToSave = {
      ...this.definition,
      revision: this.preRevertState.definition.revision
    };

    await this.saveChanges(definitionToSave);
    this.viewingRevision = null;
    this.preRevertState = null;
    this.revisionsWindowHidden = true;

    const revisionsWindow = document.getElementById(
      'revisions-window'
    ) as FloatingWindow;
    revisionsWindow.handleClose();

    // Refresh revisions list to show the new one
    this.fetchRevisions();

    // Fetch the latest version of the flow to ensure the store is up to date
    getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
  }

  private renderIssuesTab(): TemplateResult | string {
    if (!this.flowIssues?.length || !this.revisionsWindowHidden) return '';
    return html`
      <temba-floating-tab
        id="issues-tab"
        icon="alert_warning"
        label="Flow Issues"
        color="tomato"
        order="1"
        .hidden=${!this.issuesWindowHidden}
        @temba-button-clicked=${this.handleIssuesTabClick}
      ></temba-floating-tab>
    `;
  }

  private renderIssuesWindow(): TemplateResult | string {
    if (!this.flowIssues?.length) return '';
    return html`
      <temba-floating-window
        id="issues-window"
        header="Flow Issues"
        .width=${360}
        .maxHeight=${600}
        .top=${75}
        color="tomato"
        .hidden=${this.issuesWindowHidden}
        @temba-dialog-hidden=${this.handleIssuesWindowClosed}
      >
        <div style="display:flex; flex-direction:column; gap:2px;">
          ${this.flowIssues.map(
            (issue) => html`
              <div
                class="issue-list-item"
                @click=${() => this.handleIssueItemClick(issue)}
              >
                <temba-icon name="alert_warning" size="1.2"></temba-icon>
                <span>${formatIssueMessage(issue)}</span>
              </div>
            `
          )}
        </div>
      </temba-floating-window>
    `;
  }

  private renderRevisionsTab(): TemplateResult | string {
    if (this.revisions.length <= 1) return '';
    return html`
      <temba-floating-tab
        id="revisions-tab"
        icon="revisions"
        label="Revisions"
        color="rgb(142, 94, 167)"
        order="2"
        .hidden=${!this.revisionsWindowHidden && this.localizationWindowHidden}
        @temba-button-clicked=${this.handleRevisionsTabClick}
      ></temba-floating-tab>
    `;
  }

  private renderRevisionsWindow(): TemplateResult | string {
    return html`
      <temba-floating-window
        id="revisions-window"
        header="Revisions"
        .width=${360}
        .maxHeight=${600}
        .top=${75}
        color="rgb(142, 94, 167)"
        .hidden=${this.revisionsWindowHidden}
        @temba-dialog-hidden=${this.handleRevisionsWindowClosed}
      >
        <div class="localization-window-content">
          <div
            class="revisions-list"
            style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; padding-bottom:10px;"
          >
            ${this.isLoadingRevisions && !this.revisions.length
              ? html`<temba-loading></temba-loading>`
              : this.revisions.map((rev) => {
                  const isSelected = this.viewingRevision?.id === rev.id;
                  return html`
                    <div
                      class="revision-item ${isSelected ? 'selected' : ''}"
                      style="padding:8px; border-radius:4px; cursor:pointer; background:${
                        isSelected
                          ? '#f0f6ff' // Light blue bg for selected
                          : '#f9fafb'
                      }; border:1px solid ${
                    isSelected ? '#a4cafe' : '#e5e7eb'
                  }; transition: all 0.2s ease;"
                      @click=${() => this.handleRevisionClick(rev)}
                    >
                      <div
                        style="display:flex; justify-content:space-between; align-items:center;"
                      >
                        <div
                          class="revision-header"
                          style="margin-bottom: 2px;"
                        >
                          <div
                            style="font-weight:600; font-size:13px; color:#111827;"
                          >
                            <temba-date value=${
                              rev.created_on
                            } display="duration"></temba-date>
                            
                          </div>
                          <div style="font-size:11px; color:#6b7280;">
                            ${rev.user.name || rev.user.username}
                          </div>
                        </div>
                        ${
                          isSelected
                            ? html`<button
                                class="revert-button"
                                @click=${this.handleRevertClick}
                              >
                                Revert
                              </button>`
                            : html``
                        }
                        
                        </button>
                      </div>

                      ${
                        rev.comment
                          ? html`<div
                              style="font-size:12px; color:#4b5563; margin-top:4px;"
                            >
                              ${rev.comment}
                            </div>`
                          : ''
                      }
                      
                    </div>
                  `;
                })}
          </div>
        </div>
      </temba-floating-window>
    `;
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
        .top=${75}
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
    if (!this.revisionsWindowHidden) return '';
    if (this.definition?.nodes.length === 0) return '';
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
        order="3"
        .hidden=${!this.localizationWindowHidden}
        @temba-button-clicked=${this.handleLocalizationTabClick}
      ></temba-floating-tab>
    `;
  }

  /**
   * Focus on a specific node by smoothly scrolling it to the center of the canvas
   */
  public focusNode(nodeUuid: string) {
    const nodeElement = this.querySelector(
      `temba-flow-node[uuid="${nodeUuid}"]`
    ) as HTMLElement;
    if (!nodeElement) {
      return;
    }

    const editor = this.querySelector('#editor') as HTMLElement;
    if (!editor) {
      return;
    }

    // Get the editor's dimensions and scroll position
    const editorRect = editor.getBoundingClientRect();
    const editorCenterX = editorRect.width / 2;
    const editorCenterY = editorRect.height / 2;

    // Use offsetWidth/offsetHeight (unaffected by ancestor transforms)
    const nodeCenterX = nodeElement.offsetLeft + nodeElement.offsetWidth / 2;
    const nodeCenterY = nodeElement.offsetTop + nodeElement.offsetHeight / 2;

    // Calculate the scroll position needed to center the node.
    // Multiply by zoom because scroll operates in visual (transformed) space
    // while offsetLeft/offsetTop are in layout space.
    const targetScrollX = nodeCenterX * this.zoom - editorCenterX;
    const targetScrollY = nodeCenterY * this.zoom - editorCenterY;

    // Smooth scroll the editor container to the target position
    editor.scrollTo({
      left: Math.max(0, targetScrollX),
      top: Math.max(0, targetScrollY),
      behavior: 'smooth'
    });
  }

  private isReadOnly(): boolean {
    return this.viewingRevision !== null || this.isTranslating;
  }

  public render(): TemplateResult {
    // we have to embed our own style since we are in light DOM
    const style = html`<style>
      ${unsafeCSS(Editor.styles.cssText)}
      ${unsafeCSS(CanvasNode.styles.cssText)}
    </style>`;

    const stickies = this.definition?._ui?.stickies || {};

    return html`${style} ${this.renderIssuesWindow()}
      ${this.renderRevisionsWindow()} ${this.renderLocalizationWindow()}
      ${this.renderAutoTranslateDialog()}
      <div id="editor-container">
        <div id="editor">
          ${this.definition &&
          this.definition.nodes.length === 0 &&
          !this.isReadOnly()
            ? html`<div class="empty-flow">
                <div class="empty-flow-content">
                  <div class="empty-flow-title">This flow is empty</div>
                  <div class="empty-flow-description">
                    Get started by adding your first action or split to define
                    how this flow will work.
                  </div>
                  <button
                    class="empty-flow-button"
                    @click=${this.handleEmptyFlowClick}
                  >
                    Add first step
                  </button>
                </div>
              </div>`
            : ''}
          <div
            id="grid"
            class="${this.viewingRevision ? 'viewing-revision' : ''}"
            style="min-width:${100 / this.zoom}%;min-height:${100 / this.zoom}%;width:${this.canvasSize
              .width}px; height:${this.canvasSize
              .height}px;transform:scale(${this.zoom})"
          >
            <div
              id="canvas"
              class="${getClasses({
                'viewing-revision': !!this.viewingRevision,
                'read-only-connections':
                  !!this.viewingRevision || this.isTranslating
              })}"
            >
              ${this.definition
                ? repeat(
                    [...this.definition.nodes].sort((a, b) =>
                      a.uuid.localeCompare(b.uuid)
                    ),
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

                      // first node is the flow start (nodes are sorted by position)
                      const isFlowStart =
                        this.definition.nodes.length > 0 &&
                        this.definition.nodes[0].uuid === node.uuid;

                      return html`<temba-flow-node
                        class="draggable ${dragging
                          ? 'dragging'
                          : ''} ${selected ? 'selected' : ''} ${isFlowStart
                          ? 'flow-start'
                          : ''}"
                        @mousedown=${this.handleMouseDown.bind(this)}
                        uuid=${node.uuid}
                        data-node-uuid=${node.uuid}
                        style="left:${position.left}px; top:${position.top}px;transition: all 0.2s ease-in-out;"
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
              ${this.renderConnectionPlaceholder()}
            </div>
          </div>
        </div>
        <div class="save-indicator ${this.isSaving ? 'visible' : ''}">
          <temba-loading units="3" size="8"></temba-loading>
        </div>
        <div class="zoom-controls">
          <button
            @click=${this.zoomToFit}
            ?disabled=${this.zoomFitted}
            title="Zoom to fit"
          >
            <temba-icon name=${Icon.zoom_fit} size="1"></temba-icon>
          </button>
          <div class="zoom-divider"></div>
          <button
            @click=${this.zoomOut}
            ?disabled=${this.zoom <= 0.1}
            title="Zoom out"
          >
            −
          </button>
          <span class="zoom-level">${Math.round(this.zoom * 100)}%</span>
          <button
            @click=${this.zoomIn}
            ?disabled=${this.zoom >= 1.0}
            title="Zoom in"
          >
            +
          </button>
          <div class="zoom-divider"></div>
          <button
            @click=${this.zoomToFull}
            ?disabled=${this.zoom >= 1.0}
            title="Zoom to 100%"
          >
            <temba-icon name=${Icon.zoom_in} size="1"></temba-icon>
          </button>
        </div>
        ${this.reflowUnsaved
          ? html`<div class="reflow-card">
              <span class="reflow-label">Unsaved layout changes</span>
              <button class="reflow-discard" @click=${this.handleReflowDiscard}>
                Discard
              </button>
              <button class="reflow-save" @click=${this.handleReflowSave}>
                Save
              </button>
            </div>`
          : ''}
      </div>

      ${this.editingNode || this.editingAction
        ? html`<temba-node-editor
            .node=${this.editingNode}
            .nodeUI=${this.editingNodeUI}
            .action=${this.editingAction}
            .dialogOrigin=${this.dialogOrigin}
            @temba-node-saved=${(e: CustomEvent) =>
              this.handleNodeSaved(e.detail.node, e.detail.uiConfig)}
            @temba-action-saved=${(e: CustomEvent) =>
              this.handleActionSaved(e.detail.action)}
            @temba-node-edit-cancelled=${this.handleNodeEditCanceled}
          ></temba-node-editor>`
        : ''}

      <temba-canvas-menu></temba-canvas-menu>
      ${!this.viewingRevision
        ? html`<temba-node-type-selector
            .flowType=${this.flowType}
            .features=${this.features}
          ></temba-node-type-selector>`
        : ''}
      ${this.renderIssuesTab()} ${this.renderRevisionsTab()}
      ${this.renderLocalizationTab()} `;
  }
}
