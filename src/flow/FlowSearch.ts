import { html, css, LitElement, TemplateResult } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import {
  FlowDefinition,
  Node,
  Action,
  SendMsg,
  SetRunResult,
  SetContactField,
  SetContactName,
  SendEmail,
  SendBroadcast,
  EnterFlow,
  StartSession,
  CallWebhook,
  CallResthook,
  CallClassifier,
  CallLLM,
  OpenTicket,
  AddToGroup,
  RemoveFromGroup,
  SetContactChannel,
  SetContactLanguage,
  SetContactStatus,
  AddContactUrn,
  AddInputLabels,
  RequestOptin,
  SayMsg,
  PlayAudio,
  NodeUI
} from '../store/flow-definition';
import { ACTION_CONFIG, NODE_CONFIG } from './config';
import {
  ACTION_GROUP_METADATA,
  SPLIT_GROUP_METADATA,
  ActionConfig,
  NodeConfig
} from './types';
import { localizeAction } from './utils';
import { Icon } from '../Icons';
import { getTranslatableCategoriesForNode } from './categoryLocalization';

// Sticky note badge colors: border matches the sticky's border, fill is 25% lighter
const STICKY_BADGE_COLORS: Record<
  string,
  { border: string; fill: string; text: string }
> = {
  yellow: { border: '#facc15', fill: '#fcd94d', text: '#713f12' },
  blue: { border: '#3b82f6', fill: '#6ca1f8', text: '#fff' },
  pink: { border: '#ec4899', fill: '#f17ab7', text: '#fff' },
  green: { border: '#10b981', fill: '#48ca9d', text: '#fff' },
  gray: { border: '#6b7280', fill: '#8f949f', text: '#fff' }
};

export interface SearchResult {
  nodeUuid: string;
  // For actions: the action object; for nodes (splits): null
  action: Action | null;
  // The config name (e.g. "Send Message", "Call Webhook")
  typeName: string;
  // Color for the type badge background
  color: string;
  // Optional border color for the badge (used by sticky notes)
  borderColor?: string;
  // Optional text color override for the badge
  textColor?: string;
  // The full text that was searched
  fullText: string;
  // The index of the match start in fullText
  matchStart: number;
  // The length of the match
  matchLength: number;
  // For sticky notes: which field matched ('title' or 'body')
  stickyField?: 'title' | 'body';
}

type SearchScope = 'flow' | 'table';

/**
 * Extract searchable text from an action.
 * Returns an array of text strings to search through.
 */
function getActionSearchTexts(action: Action): string[] {
  const texts: string[] = [];
  switch (action.type) {
    case 'send_msg': {
      const a = action as SendMsg;
      if (a.text) texts.push(a.text);
      if (a.quick_replies) texts.push(...a.quick_replies);
      if (a.template?.name) texts.push(a.template.name);
      break;
    }
    case 'send_email': {
      const a = action as SendEmail;
      if (a.subject) texts.push(a.subject);
      if (a.body) texts.push(a.body);
      if (a.addresses) texts.push(...a.addresses);
      break;
    }
    case 'send_broadcast': {
      const a = action as SendBroadcast;
      if (a.text) texts.push(a.text);
      if (a.groups) texts.push(...a.groups.map((g) => g.name));
      if (a.contacts) texts.push(...a.contacts.map((c) => c.name));
      if (a.template?.name) texts.push(a.template.name);
      break;
    }
    case 'say_msg': {
      const a = action as SayMsg;
      if (a.text) texts.push(a.text);
      break;
    }
    case 'play_audio': {
      const a = action as PlayAudio;
      if (a.audio_url) texts.push(a.audio_url);
      break;
    }
    case 'set_contact_name': {
      const a = action as SetContactName;
      if (a.name) texts.push(a.name);
      break;
    }
    case 'set_contact_field': {
      const a = action as SetContactField;
      if (a.field?.name) texts.push(a.field.name);
      if (a.value) texts.push(a.value);
      break;
    }
    case 'set_contact_language': {
      const a = action as SetContactLanguage;
      if (a.language) texts.push(a.language);
      break;
    }
    case 'set_contact_status': {
      const a = action as SetContactStatus;
      if (a.status) texts.push(a.status);
      break;
    }
    case 'set_contact_channel': {
      const a = action as SetContactChannel;
      if (a.channel?.name) texts.push(a.channel.name);
      break;
    }
    case 'add_contact_urn': {
      const a = action as AddContactUrn;
      if (a.path) texts.push(a.path);
      break;
    }
    case 'add_contact_groups': {
      const a = action as AddToGroup;
      if (a.groups) texts.push(...a.groups.map((g) => g.name));
      break;
    }
    case 'remove_contact_groups': {
      const a = action as RemoveFromGroup;
      if (a.groups) texts.push(...a.groups.map((g) => g.name));
      break;
    }
    case 'add_input_labels': {
      const a = action as AddInputLabels;
      if (a.labels) texts.push(...a.labels.map((l) => l.name));
      break;
    }
    case 'set_run_result': {
      const a = action as SetRunResult;
      if (a.name) texts.push(a.name);
      if (a.value) texts.push(a.value);
      if (a.category) texts.push(a.category);
      break;
    }
    case 'enter_flow': {
      const a = action as EnterFlow;
      if (a.flow?.name) texts.push(a.flow.name);
      break;
    }
    case 'start_session': {
      const a = action as StartSession;
      if (a.flow?.name) texts.push(a.flow.name);
      if (a.groups) texts.push(...a.groups.map((g) => g.name));
      if (a.contacts) texts.push(...a.contacts.map((c) => c.name));
      break;
    }
    case 'request_optin': {
      const a = action as RequestOptin;
      if (a.optin?.name) texts.push(a.optin.name);
      break;
    }
    case 'call_webhook': {
      const a = action as CallWebhook;
      if (a.url) texts.push(a.url);
      if (a.body) texts.push(a.body);
      break;
    }
    case 'call_resthook': {
      const a = action as CallResthook;
      if (a.resthook) texts.push(a.resthook);
      break;
    }
    case 'call_llm': {
      const a = action as CallLLM;
      if (a.llm?.name) texts.push(a.llm.name);
      if (a.instructions) texts.push(a.instructions);
      if (a.input) texts.push(a.input);
      break;
    }
    case 'call_classifier': {
      const a = action as CallClassifier;
      if (a.classifier?.name) texts.push(a.classifier.name);
      if (a.input) texts.push(a.input);
      break;
    }
    case 'open_ticket': {
      const a = action as OpenTicket;
      if (a.topic?.name) texts.push(a.topic.name);
      if (a.subject) texts.push(a.subject);
      if (a.body) texts.push(a.body);
      if (a.assignee?.name) texts.push(a.assignee.name);
      break;
    }
  }
  return texts;
}

function getTableMessageSearchTexts(action: SendMsg): string[] {
  const texts: string[] = [];
  if (action.text) texts.push(action.text);
  if (action.quick_replies) texts.push(...action.quick_replies);
  return texts;
}

/**
 * Get searchable text from node-level data (router operand, categories, result name, etc.)
 */
function getNodeSearchTexts(
  node: Node,
  nodeUI: NodeUI,
  langLocalization?: Record<string, Record<string, any>>
): string[] {
  const texts: string[] = [];

  // Router operand
  if (node.router?.operand) {
    texts.push(node.router.operand);
  }

  // Result name
  if (node.router?.result_name) {
    texts.push(node.router.result_name);
  }

  // Category names (localized if available)
  if (node.router?.categories) {
    for (const cat of node.router.categories) {
      if (cat.name && cat.name !== 'Other' && cat.name !== 'All Responses') {
        texts.push(
          localizeCategoryName(cat.uuid, cat.name, langLocalization)
        );
      }
    }
  }

  // Case arguments (rule values like keywords, numbers, etc.)
  if (node.router?.cases) {
    for (const c of node.router.cases) {
      if (c.arguments) {
        for (const arg of c.arguments) {
          if (arg) texts.push(arg);
        }
      }
    }
  }

  // Config-level name (e.g. for split_by_contact_field with custom title)
  if (nodeUI?.config?.operand?.name) {
    texts.push(nodeUI.config.operand.name);
  }

  return texts;
}

function getColor(
  actionConfig: ActionConfig | undefined,
  nodeConfig: NodeConfig | undefined
): string {
  if (actionConfig?.group) {
    return ACTION_GROUP_METADATA[actionConfig.group]?.color || '#aaaaaa';
  }
  if (nodeConfig?.group) {
    return (
      ACTION_GROUP_METADATA[nodeConfig.group as any]?.color ||
      SPLIT_GROUP_METADATA[nodeConfig.group as any]?.color ||
      '#aaaaaa'
    );
  }
  return '#aaaaaa';
}

function getTypeName(
  actionConfig: ActionConfig | undefined,
  nodeConfig: NodeConfig | undefined
): string {
  if (actionConfig?.name) return actionConfig.name;
  if (nodeConfig?.name) return nodeConfig.name;
  return 'Unknown';
}

/**
 * Get the localized name for a category, falling back to the original name.
 */
function localizeCategoryName(
  categoryUuid: string,
  originalName: string,
  langLocalization: Record<string, Record<string, any>> | undefined
): string {
  const catLoc = langLocalization?.[categoryUuid];
  if (catLoc?.name && Array.isArray(catLoc.name) && catLoc.name[0]) {
    return catLoc.name[0];
  }
  return originalName;
}

export class FlowSearch extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100000;
      display: none;
      font-family: var(--font-family, sans-serif);
    }

    :host([open]) {
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
    }

    .search-container {
      position: relative;
      margin-top: 80px;
      width: 560px;
      max-height: calc(100vh - 160px);
      background: white;
      border-radius: 14px;
      box-shadow:
        0 24px 80px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: searchSlideIn 0.15s ease-out;
    }

    @keyframes searchSlideIn {
      from {
        opacity: 0;
        transform: scale(0.98) translateY(-8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .search-input-row {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid #e5e7eb;
      gap: 10px;
    }

    .search-icon {
      color: #9ca3af;
      flex-shrink: 0;
    }

    .search-icon temba-icon {
      --icon-color: #9ca3af;
      display: block;
    }

    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 16px;
      background: transparent;
      color: #111;
      font-family: inherit;
    }

    input::placeholder {
      color: #9ca3af;
    }

    .results {
      overflow-y: auto;
      max-height: 400px;
    }

    .result-item {
      display: flex;
      align-items: center;
      padding: 10px 18px;
      gap: 12px;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
      transition: background 0.08s;
    }

    .result-item:last-child {
      border-bottom: none;
    }

    .result-item:hover,
    .result-item.highlighted {
      background: #f0f4ff;
    }

    .result-type-badge {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      color: white;
      padding: 2px 10px;
      border-radius: 8px;
      border: 2px solid transparent;
      white-space: nowrap;
      text-align: center;
      box-sizing: border-box;
    }

    .result-text {
      min-width: 0;
      font-size: 14px;
      color: #374151;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .result-text mark {
      background: #fef08a;
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }

    .no-results {
      padding: 24px 18px;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }

    .result-count {
      padding: 8px 18px;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      text-align: right;
      flex-shrink: 0;
    }

    .hint {
      padding: 10px 18px;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    kbd {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 11px;
      font-family: inherit;
    }
  `;

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ attribute: false })
  definition: FlowDefinition | null = null;

  @property({ type: String })
  languageCode: string = '';

  @property({ type: String })
  scope: SearchScope = 'flow';

  @property({ type: Boolean })
  includeCategories = false;

  @state()
  private searchQuery = '';

  @state()
  private results: SearchResult[] = [];

  @state()
  private highlightedIndex = 0;

  @query('input')
  private inputEl!: HTMLInputElement;

  public show(): void {
    this.open = true;
    this.searchQuery = '';
    this.results = [];
    this.highlightedIndex = 0;
    this.updateComplete.then(() => {
      this.inputEl?.focus();
      this.inputEl?.select();
    });
  }

  public hide(): void {
    this.open = false;
    this.searchQuery = '';
    this.results = [];
  }

  private handleInput(e: InputEvent): void {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.performSearch();
    this.highlightedIndex = 0;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
      return;
    }
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault();
      if (this.results.length > 0) {
        this.highlightedIndex =
          (this.highlightedIndex + 1) % this.results.length;
      }
      return;
    }
    if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      if (this.results.length > 0) {
        this.highlightedIndex =
          (this.highlightedIndex - 1 + this.results.length) %
          this.results.length;
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.results.length > 0) {
        this.selectResult(this.results[this.highlightedIndex]);
      }
      return;
    }
  }

  private handleBackdropClick(): void {
    this.hide();
  }

  private selectResult(result: SearchResult): void {
    this.hide();
    this.dispatchEvent(
      new CustomEvent('temba-search-result-selected', {
        detail: result,
        bubbles: true,
        composed: true
      })
    );
  }

  private performSearch(): void {
    if (!this.definition || !this.searchQuery.trim()) {
      this.results = [];
      return;
    }

    const query = this.searchQuery.toLowerCase();

    // Get the localization map for the active language (if translating)
    const isTranslating =
      this.languageCode && this.languageCode !== this.definition.language;
    const langLocalization = isTranslating
      ? this.definition.localization?.[this.languageCode]
      : undefined;

    if (this.scope === 'table') {
      this.results = this.performTableSearch(query, langLocalization);
      return;
    }

    this.results = this.performFlowSearch(query, langLocalization);
  }

  private performFlowSearch(
    query: string,
    langLocalization: Record<string, Record<string, any>> | undefined
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const node of this.definition.nodes) {
      const nodeUI = this.definition._ui?.nodes[node.uuid];
      const nodeType = nodeUI?.type || 'execute_actions';

      if (nodeType === 'execute_actions') {
        // For action-set nodes, search each action individually
        if (node.actions) {
          for (const action of node.actions) {
            const actionConfig = ACTION_CONFIG[action.type];
            const searchAction = localizeAction(
              action,
              langLocalization?.[action.uuid]
            );
            const texts = getActionSearchTexts(searchAction);
            for (const text of texts) {
              const lowerText = text.toLowerCase();
              const idx = lowerText.indexOf(query);
              if (idx !== -1) {
                results.push({
                  nodeUuid: node.uuid,
                  action,
                  typeName: getTypeName(actionConfig, undefined),
                  color: getColor(actionConfig, undefined),
                  fullText: text,
                  matchStart: idx,
                  matchLength: query.length
                });
                break; // One match per action is enough
              }
            }
          }
        }
      } else {
        // For split/wait nodes, search node-level text and embedded actions together
        const nodeConfig = NODE_CONFIG[nodeType];
        const nodeTexts = getNodeSearchTexts(node, nodeUI, langLocalization);

        // Include searchable text from embedded actions (e.g. call_webhook in split_by_webhook)
        if (node.actions) {
          for (const action of node.actions) {
            const searchAction = localizeAction(
              action,
              langLocalization?.[action.uuid]
            );
            nodeTexts.push(...getActionSearchTexts(searchAction));
          }
        }

        for (const text of nodeTexts) {
          const lowerText = text.toLowerCase();
          const idx = lowerText.indexOf(query);
          if (idx !== -1) {
            results.push({
              nodeUuid: node.uuid,
              action: null,
              typeName: getTypeName(undefined, nodeConfig),
              color: getColor(undefined, nodeConfig),
              fullText: text,
              matchStart: idx,
              matchLength: query.length
            });
            break; // One match per node is enough
          }
        }
      }
    }

    // Also search sticky notes
    const stickies = this.definition._ui?.stickies || {};
    for (const [uuid, sticky] of Object.entries(stickies)) {
      const fields: { text: string; field: 'title' | 'body' }[] = [];
      if (sticky.title) fields.push({ text: sticky.title, field: 'title' });
      if (sticky.body) fields.push({ text: sticky.body, field: 'body' });
      for (const { text, field } of fields) {
        const lowerText = text.toLowerCase();
        const idx = lowerText.indexOf(query);
        if (idx !== -1) {
          const colors =
            STICKY_BADGE_COLORS[sticky.color] || STICKY_BADGE_COLORS.yellow;
          results.push({
            nodeUuid: uuid,
            action: null,
            typeName: 'Sticky Note',
            color: colors.fill,
            borderColor: colors.border,
            textColor: colors.text,
            fullText: text,
            matchStart: idx,
            matchLength: query.length,
            stickyField: field
          });
          break;
        }
      }
    }

    return results;
  }

  private performTableSearch(
    query: string,
    langLocalization: Record<string, Record<string, any>> | undefined
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const node of this.definition.nodes) {
      const nodeUI = this.definition._ui?.nodes[node.uuid];
      const nodeType = nodeUI?.type || 'execute_actions';

      // Message table rows: one row per send_msg action
      if (node.actions) {
        for (const action of node.actions) {
          if (action.type !== 'send_msg') {
            continue;
          }

          const actionConfig = ACTION_CONFIG[action.type];
          const searchAction = localizeAction(
            action,
            langLocalization?.[action.uuid]
          ) as SendMsg;
          const texts = getTableMessageSearchTexts(searchAction);
          for (const text of texts) {
            const idx = text.toLowerCase().indexOf(query);
            if (idx !== -1) {
              results.push({
                nodeUuid: node.uuid,
                action,
                typeName: getTypeName(actionConfig, undefined),
                color: getColor(actionConfig, undefined),
                fullText: text,
                matchStart: idx,
                matchLength: query.length
              });
              break;
            }
          }
        }
      }

      // Message table category rows: one grouped row per node when enabled.
      if (
        this.includeCategories &&
        node.router?.categories?.length &&
        NODE_CONFIG[nodeType]?.localizable === 'categories'
      ) {
        const categories = getTranslatableCategoriesForNode(
          nodeType,
          node.router.categories
        );
        if (!categories.length) {
          continue;
        }

        const nodeConfig = NODE_CONFIG[nodeType];
        const categoryTexts = categories.map((cat) =>
          localizeCategoryName(cat.uuid, cat.name, langLocalization)
        );

        for (const text of categoryTexts) {
          const idx = text.toLowerCase().indexOf(query);
          if (idx !== -1) {
            results.push({
              nodeUuid: node.uuid,
              action: null,
              typeName: getTypeName(undefined, nodeConfig),
              color: getColor(undefined, nodeConfig),
              fullText: text,
              matchStart: idx,
              matchLength: query.length
            });
            break;
          }
        }
      }
    }

    return results;
  }

  private renderMatchText(result: SearchResult): TemplateResult {
    const { matchStart, matchLength } = result;
    const matchEnd = matchStart + matchLength;

    // Replace newlines with spaces for single-line display
    const text = result.fullText.replace(/\n/g, ' ');

    // Show leading context before the match, then the match, then trailing.
    // CSS text-overflow:ellipsis clips the trailing text, so we keep the match
    // near the start. When the match is near the end of the text, show more
    // leading context since there's less trailing text to display.
    const afterMatch = text.length - matchEnd;
    const contextBefore = afterMatch < 30 ? 50 : 20;
    const start = Math.max(0, matchStart - contextBefore);
    const prefix = start > 0 ? '\u2026' : '';

    const before = text.slice(start, matchStart);
    const match = text.slice(matchStart, matchEnd);
    const after = text.slice(matchEnd);

    return html`${prefix}${before}<mark>${match}</mark>${after}`;
  }

  updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has('highlightedIndex')) {
      const highlighted = this.shadowRoot?.querySelector(
        '.result-item.highlighted'
      );
      highlighted?.scrollIntoView({ block: 'nearest' });
    }
  }

  render(): TemplateResult {
    const isTableScope = this.scope === 'table';
    const searchLabel = isTableScope ? 'Search this table' : 'Search this flow';

    return html`
      <div class="backdrop" @click=${this.handleBackdropClick}></div>
      <div
        class="search-container"
        role="dialog"
        aria-modal="true"
        aria-label=${searchLabel}
        @click=${(e: Event) => e.stopPropagation()}
      >
        <div class="search-input-row">
          <div class="search-icon">
            <temba-icon name=${Icon.search} size="1.5"></temba-icon>
          </div>
          <input
            type="text"
            placeholder="${searchLabel}..."
            aria-label=${searchLabel}
            .value=${this.searchQuery}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
          />
        </div>
        ${this.searchQuery.trim()
          ? this.results.length > 0
            ? html`
                <div class="results">
                  ${this.results.map(
                    (result, index) => html`
                      <div
                        class="result-item ${index === this.highlightedIndex
                          ? 'highlighted'
                          : ''}"
                        @click=${() => this.selectResult(result)}
                        @mouseenter=${() => {
                          this.highlightedIndex = index;
                        }}
                      >
                        <div
                          class="result-type-badge"
                          style="background:${result.color};border-color:${result.borderColor || result.color}${result.textColor ? `;color:${result.textColor}` : ''}"
                        >
                          ${result.typeName}
                        </div>
                        <div class="result-text">
                          ${this.renderMatchText(result)}
                        </div>
                      </div>
                    `
                  )}
                </div>
                <div class="result-count">
                  ${this.results.length}
                  result${this.results.length !== 1 ? 's' : ''}
                </div>
              `
            : html`<div class="no-results">No matches found</div>`
          : html`<div class="hint">
              <kbd>↑</kbd> <kbd>↓</kbd> to navigate &nbsp;
              <kbd>Enter</kbd> to open &nbsp; <kbd>Esc</kbd> to close
            </div>`}
      </div>
    `;
  }
}
