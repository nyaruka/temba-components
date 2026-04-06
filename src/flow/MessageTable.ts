import { html, TemplateResult } from 'lit-html';
import { css } from 'lit';
import { RapidElement } from '../RapidElement';
import {
  FlowDefinition,
  Node,
  SendMsg
} from '../store/flow-definition';
import { AppState, fromStore, zustand } from '../store/AppState';
import { CustomEventType } from '../interfaces';
import { renderHighlightedText } from './utils';

interface MessageEntry {
  node: Node;
  action: SendMsg;
  nodeIndex: number;
}

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

      .message-cell {
        cursor: pointer;
        border-radius: 6px;
        padding: 10px 12px;
        margin: -4px -6px;
        transition: background 0.15s;
        white-space: pre-line;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 14px;
        color: #333;
      }

      .message-cell:hover {
        background: #f5f8ff;
      }

      .translation-cell {
        cursor: pointer;
        border-radius: 6px;
        padding: 10px 12px;
        min-height: 100%;
        box-sizing: border-box;
        transition: background 0.15s;
        white-space: pre-line;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 14px;
        height: 100%;
      }

      .translation-cell:hover {
        background: #f5f8ff;
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

  private getMessageEntries(): MessageEntry[] {
    if (!this.definition?.nodes) return [];

    const entries: MessageEntry[] = [];
    let nodeIndex = 0;

    for (const node of this.definition.nodes) {
      nodeIndex++;
      for (const action of node.actions || []) {
        if (action.type === 'send_msg') {
          entries.push({
            node,
            action: action as SendMsg,
            nodeIndex
          });
        }
      }
    }

    return entries;
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

  public render(): TemplateResult {
    const entries = this.getMessageEntries();

    if (entries.length === 0) {
      return html`<div class="empty-state">
        No Send Message actions in this flow.
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
          ${entries.map((entry, idx) => {
            const translatedText = showTranslation
              ? this.getTranslatedText(entry.action.uuid)
              : null;

            return html`
              <tr>
                <td>
                  <div
                    class="message-cell"
                    @click=${() => this.handleBaseTextClick(entry)}
                    title="Click to edit message"
                  >${renderHighlightedText(entry.action.text, true)}${(entry.action.quick_replies || []).length > 0
                      ? html`<div class="quick-replies">${(entry.action.quick_replies || []).map(
                          (reply) => html`<div class="quick-reply">${reply}</div>`
                        )}</div>`
                      : ''}</div>
                </td>
                ${showTranslation
                  ? html`<td class="translation-td">
                      <div
                        class="translation-cell ${translatedText
                          ? 'has-translation'
                          : 'missing-translation'}"
                        @click=${() => this.handleTranslationClick(entry)}
                        title="Click to edit translation"
                      >${translatedText ? renderHighlightedText(translatedText, true) : 'No translation'}</div>
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
