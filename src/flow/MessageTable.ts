import { html, TemplateResult } from 'lit-html';
import { css } from 'lit';
import { RapidElement } from '../RapidElement';
import {
  Category,
  FlowDefinition,
  Node,
  SendMsg
} from '../store/flow-definition';
import { AppState, fromStore, zustand } from '../store/AppState';
import { CustomEventType } from '../interfaces';
import { renderHighlightedText } from './utils';
import { ACTION_CONFIG, NODE_CONFIG } from './config';
import { ACTION_GROUP_METADATA, SPLIT_GROUP_METADATA } from './types';
import {
  getTranslatableCategoriesForNode,
  hasTranslatableCategoriesForNode
} from './categoryLocalization';

interface MessageEntry {
  kind: 'message';
  node: Node;
  action: SendMsg;
  nodeIndex: number;
}

interface CategoryGroupEntry {
  kind: 'category-group';
  node: Node;
  categories: Category[];
  nodeIndex: number;
}

type TableEntry = MessageEntry | CategoryGroupEntry;

export class MessageTable extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: block;
        overflow: auto;
        flex: 1;
        background: #fff;
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .message-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .message-table th {
        text-align: left;
        padding: 10px 16px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
        border-bottom: 2px solid #e8e8e8;
        background: #fff;
      }

      .message-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }

      .message-table td.translation-td {
        padding: 8px;
        height: 1px;
      }

      .message-table tr.category-row td {
        padding: 8px 16px;
      }

      .message-table tr.category-row td.translation-td {
        padding: 8px;
      }

      .message-cell {
        cursor: pointer;
        position: relative;
        border-radius: 0 6px 6px 0;
        padding: 10px 12px 10px 16px;
        margin: -4px -6px;
        transition: background 0.15s;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 14px;
        color: #333;
      }

      .message-cell::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: var(--node-rail-color, #d1d5db);
      }

      .message-cell:hover {
        background: #f5f8ff;
      }

      .category-stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .category-stack-original {
        padding-left: 14px;
      }

      .category-item {
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 14px;
        line-height: 1.5;
      }

      .category-original-item {
        color: #334155;
        background: #f7f9fc;
      }

      .category-translation-item {
        width: 100%;
        box-sizing: border-box;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        background: transparent;
      }

      .category-translation-item.missing {
        color: #bbb;
        font-style: italic;
        background: #fafafa;
      }

      .translation-cell {
        cursor: pointer;
        border-radius: 6px;
        padding: 10px 12px;
        min-height: 100%;
        box-sizing: border-box;
        transition: background 0.15s;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 14px;
        height: 100%;
      }

      .translation-cell:hover {
        background: #f5f8ff;
      }

      .translation-cell.category-translation-cell {
        padding: 0;
        border-radius: 0;
        background: transparent;
      }

      .message-cell.category-message-cell {
        margin: 0 -6px;
        padding: 0;
        border-radius: 0;
        background: transparent;
      }

      .translation-cell.category-translation-cell:hover {
        background: transparent;
      }

      .message-cell.category-message-cell:hover {
        background: transparent;
      }

      .message-cell.category-message-cell .category-original-item {
        transition: background 0.15s;
      }

      .message-cell.category-message-cell:hover .category-original-item {
        background: #f0f4f9;
      }

      .translation-cell.category-translation-cell .category-translation-item {
        transition: background 0.15s;
      }

      .translation-cell.category-translation-cell:hover .category-translation-item {
        background: #f5f8ff;
      }

      .translation-cell.category-translation-cell:hover .category-translation-item.missing {
        color: #9bb8df;
      }

      .translation-cell.has-translation {
        color: #333;
      }

      .translation-cell.missing-translation {
        color: #bbb;
        font-style: italic;
        background: #fafafa;
      }

      .translation-cell.missing-translation:hover {
        background: #f5f8ff;
        color: #9bb8df;
      }

      .quick-replies {
        margin-top: 0.5em;
        display: flex;
        flex-wrap: wrap;
      }

      .quick-replies.standalone {
        margin-top: 0;
      }

      .quick-reply {
        border: 1px solid rgb(60, 146, 221);
        border-radius: 18px;
        padding: 2px 6px;
        font-size: 11px;
        color: rgb(60, 146, 221);
        margin: 0.15em;
        background: #fff;
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: #999;
        font-size: 14px;
        padding: 60px 20px;
        text-align: center;
      }
    `;
  }

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private definition!: FlowDefinition;

  @fromStore(zustand, (state: AppState) => state.languageCode)
  private languageCode!: string;

  @fromStore(zustand, (state: AppState) => state.isTranslating)
  private isTranslating!: boolean;

  private shouldIncludeCategories(node: Node): boolean {
    if (!this.isTranslating) {
      return false;
    }

    const includeCategories = !!this.definition?._ui?.translation_filters
      ?.categories;
    if (!includeCategories || !node.router?.categories?.length) {
      return false;
    }

    const nodeType = this.definition?._ui?.nodes?.[node.uuid]?.type;
    if (!nodeType) {
      return false;
    }

    if (NODE_CONFIG[nodeType]?.localizable !== 'categories') {
      return false;
    }

    return hasTranslatableCategoriesForNode(nodeType, node.router?.categories);
  }

  private getEntries(): TableEntry[] {
    if (!this.definition?.nodes) return [];

    const entries: TableEntry[] = [];
    let nodeIndex = 0;

    for (const node of this.definition.nodes) {
      nodeIndex++;
      for (const action of node.actions || []) {
        if (action.type === 'send_msg') {
          entries.push({
            kind: 'message',
            node,
            action: action as SendMsg,
            nodeIndex
          });
        }
      }

      if (this.shouldIncludeCategories(node)) {
        const nodeType = this.definition?._ui?.nodes?.[node.uuid]?.type;
        const categories = getTranslatableCategoriesForNode(
          nodeType,
          node.router?.categories
        );
        if (categories.length === 0) {
          continue;
        }

        entries.push({
          kind: 'category-group',
          node,
          categories,
          nodeIndex
        });
      }
    }

    return entries;
  }

  public focusSearchResult(nodeUuid: string, actionUuid: string | null): void {
    const rows = Array.from(
      this.renderRoot.querySelectorAll('tr[data-node-uuid]')
    ) as HTMLTableRowElement[];
    if (!rows.length) {
      return;
    }

    let target = actionUuid
      ? rows.find(
          (row) =>
            row.dataset.nodeUuid === nodeUuid &&
            row.dataset.actionUuid === actionUuid
        )
      : rows.find(
          (row) =>
            row.dataset.nodeUuid === nodeUuid &&
            row.dataset.entryKind === 'category-group'
        );

    if (!target) {
      target = rows.find((row) => row.dataset.nodeUuid === nodeUuid);
    }

    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private getTranslatedText(actionUuid: string): string | null {
    if (!this.isTranslating || !this.languageCode) return null;

    const localization =
      this.definition?.localization?.[this.languageCode]?.[actionUuid];
    if (localization?.text && Array.isArray(localization.text)) {
      return localization.text[0] || null;
    }
    return null;
  }

  private getTranslatedQuickReplies(actionUuid: string): string[] {
    if (!this.isTranslating || !this.languageCode) return [];

    const localization =
      this.definition?.localization?.[this.languageCode]?.[actionUuid];
    if (!Array.isArray(localization?.quick_replies)) {
      return [];
    }

    return localization.quick_replies
      .map((reply: unknown) =>
        typeof reply === 'string' ? reply.trim() : ''
      )
      .filter((reply: string) => reply.length > 0);
  }

  private stripLeadingLineBreaks(text: string): string {
    return text.replace(/^(?:\r?\n)+/, '');
  }

  private getTranslatedCategoryName(categoryUuid: string): string | null {
    if (!this.isTranslating || !this.languageCode) return null;

    const localization =
      this.definition?.localization?.[this.languageCode]?.[categoryUuid];
    if (!localization?.name) {
      return null;
    }
    if (Array.isArray(localization.name)) {
      return localization.name[0] || null;
    }
    return typeof localization.name === 'string' ? localization.name : null;
  }

  private handleBaseTextClick(entry: MessageEntry): void {
    this.fireCustomEvent(CustomEventType.ActionEditRequested, {
      action: entry.action,
      nodeUuid: entry.node.uuid,
      forceBase: true
    });
  }

  private handleTranslationClick(entry: MessageEntry): void {
    this.fireCustomEvent(CustomEventType.ActionEditRequested, {
      action: entry.action,
      nodeUuid: entry.node.uuid
    });
  }

  private handleBaseCategoryClick(entry: CategoryGroupEntry): void {
    const nodeUI = this.definition?._ui?.nodes?.[entry.node.uuid];
    if (!nodeUI) {
      return;
    }

    this.fireCustomEvent(CustomEventType.NodeEditRequested, {
      node: entry.node,
      nodeUI,
      forceBase: true
    });
  }

  private handleCategoryTranslationClick(entry: CategoryGroupEntry): void {
    const nodeUI = this.definition?._ui?.nodes?.[entry.node.uuid];
    if (!nodeUI) {
      return;
    }

    this.fireCustomEvent(CustomEventType.NodeEditRequested, {
      node: entry.node,
      nodeUI
    });
  }

  private getCategoryTranslations(entry: CategoryGroupEntry): Array<{
    original: string;
    translated: string | null;
  }> {
    return entry.categories.map((category) => ({
      original: category.name,
      translated: this.getTranslatedCategoryName(category.uuid)
    }));
  }

  private getEntryRailColor(entry: TableEntry): string {
    if (entry.kind === 'message') {
      const actionConfig = ACTION_CONFIG[entry.action.type];
      const actionGroup = actionConfig?.group;
      return actionGroup
        ? ACTION_GROUP_METADATA[actionGroup]?.color || '#cbd5e1'
        : '#cbd5e1';
    }

    const nodeType = this.definition?._ui?.nodes?.[entry.node.uuid]?.type;
    if (!nodeType) {
      return '#cbd5e1';
    }

    const nodeConfig = NODE_CONFIG[nodeType];
    const nodeGroup = nodeConfig?.group;
    if (!nodeGroup) {
      return '#cbd5e1';
    }

    return (
      ACTION_GROUP_METADATA[nodeGroup]?.color ||
      SPLIT_GROUP_METADATA[nodeGroup]?.color ||
      '#cbd5e1'
    );
  }

  public render(): TemplateResult {
    const entries = this.getEntries();

    if (entries.length === 0) {
      return html`<div class="empty-state">
        No messages or localizable categories in this flow.
      </div>`;
    }

    const showTranslation = this.isTranslating;

    return html`
      <table class="message-table">
        <thead>
          <tr>
            <th>${showTranslation ? 'Original Text' : 'Message Text'}</th>
            ${showTranslation ? html`<th>Translation</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry) => {
            const translatedText =
              showTranslation && entry.kind === 'message'
                ? this.getTranslatedText(entry.action.uuid)
                : showTranslation && entry.kind === 'category-group'
                  ? this.getCategoryTranslations(entry)
                  : null;
            const translatedQuickReplies =
              showTranslation && entry.kind === 'message'
                ? this.getTranslatedQuickReplies(entry.action.uuid)
                : [];
            const hasCategoryTranslation =
              entry.kind === 'category-group' &&
              Array.isArray(translatedText) &&
              translatedText.some((item) => !!item.translated);
            const hasMessageTranslation =
              entry.kind === 'message' &&
              (!!translatedText || translatedQuickReplies.length > 0);
            const hasTranslation =
              entry.kind === 'message'
                ? hasMessageTranslation
                : hasCategoryTranslation;
            const translationCellClass =
              entry.kind === 'category-group'
                ? 'translation-cell category-translation-cell'
                : `translation-cell ${hasTranslation
                    ? 'has-translation'
                    : 'missing-translation'}`;

            return html`
              <tr
                class=${entry.kind === 'category-group' ? 'category-row' : ''}
                style=${`--node-rail-color: ${this.getEntryRailColor(entry)};`}
                data-node-uuid=${entry.node.uuid}
                data-entry-kind=${entry.kind}
                data-action-uuid=${entry.kind === 'message'
                  ? entry.action.uuid
                  : ''}
              >
                <td>
                  <div
                    class="message-cell ${entry.kind === 'category-group'
                      ? 'category-message-cell'
                      : ''}"
                    @click=${() =>
                      entry.kind === 'message'
                        ? this.handleBaseTextClick(entry)
                        : this.handleBaseCategoryClick(entry)}
                    title=${entry.kind === 'message'
                      ? 'Click to edit message'
                      : 'Click to edit category'}
                  >
                    ${entry.kind === 'category-group'
                      ? html`
                          <div class="category-stack category-stack-original">
                            ${entry.categories.map(
                              (category) => html`
                                <div class="category-item category-original-item">
                                  <span>${renderHighlightedText(category.name, true)}</span>
                                </div>
                              `
                            )}
                          </div>
                        `
                      : html`${renderHighlightedText(
                          this.stripLeadingLineBreaks(entry.action.text || ''),
                          true
                        )}${(entry.action.quick_replies || [])
                          .length > 0
                          ? html`<div class="quick-replies">${(entry.action.quick_replies || []).map(
                              (reply) => html`<div class="quick-reply">${reply}</div>`
                            )}</div>`
                          : ''}`}
                  </div>
                </td>
                ${showTranslation
                  ? html`<td class="translation-td">
                      <div
                        class=${translationCellClass}
                        @click=${() =>
                          entry.kind === 'message'
                            ? this.handleTranslationClick(entry)
                            : this.handleCategoryTranslationClick(entry)}
                        title=${entry.kind === 'message'
                          ? 'Click to edit translation'
                          : 'Click to edit category translation'}
                      >
                        ${entry.kind === 'category-group' &&
                        Array.isArray(translatedText)
                          ? html`<div class="category-stack">
                              ${translatedText.map(
                                (item) => html`
                                  <div
                                    class="category-item category-translation-item ${item.translated
                                      ? ''
                                      : 'missing'}"
                                  >
                                    <span>${item.translated
                                      ? renderHighlightedText(
                                          item.translated,
                                          true
                                        )
                                      : 'No translation'}</span>
                                  </div>
                                `
                              )}
                            </div>`
                          : entry.kind === 'message'
                            ? html`${typeof translatedText === 'string'
                                ? renderHighlightedText(
                                    this.stripLeadingLineBreaks(translatedText),
                                    true
                                  )
                                : translatedQuickReplies.length === 0
                                  ? 'No translation'
                                  : ''}${translatedQuickReplies.length > 0
                                ? html`<div
                                    class="quick-replies ${translatedText
                                      ? ''
                                      : 'standalone'}"
                                  >
                                    ${translatedQuickReplies.map(
                                      (reply) =>
                                        html`<div class="quick-reply">${reply}</div>`
                                    )}
                                  </div>`
                                : ''}`
                            : 'No translation'}
                      </div>
                    </td>`
                  : ''}
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }
}
