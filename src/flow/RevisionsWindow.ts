import { html, TemplateResult } from 'lit-html';
import { css, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { getStore } from '../store/Store';
import { FlowDefinition } from '../store/flow-definition';
import { fetchResults } from '../utils';
import { FLOW_SPEC_VERSION } from '../store/AppState';
import {
  labelsFor,
  RevisionChanges,
  summarizeChanges
} from './revision-summary';

const GROUP_WINDOW_MS = 15 * 60 * 1000;
const MAX_GROUP_LABELS = 3;

export interface Revision {
  id: number;
  user: {
    id?: number;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  created_on: string;
  comment?: string;
  changes?: RevisionChanges | null;
}

export class RevisionsWindow extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: contents;
      }
    `;
  }

  @property({ type: String })
  flow = '';

  @property({ type: Boolean })
  hidden = true;

  @property({ type: Boolean })
  saving = false;

  @state()
  private revisions: Revision[] = [];

  @state()
  private viewingRevision: Revision | null = null;

  @state()
  private isLoading = false;

  private preRevertState: {
    definition: FlowDefinition;
    dirtyDate: Date | null;
  } | null = null;
  private browseLanguageCode: string | null = null;
  private fetchRequestId = 0;

  public get isViewingRevision(): boolean {
    return this.viewingRevision !== null;
  }

  public refresh(): void {
    if (!this.hidden) {
      this.fetchRevisions();
    }
  }

  protected updated(changes: PropertyValues): void {
    super.updated(changes);
    if (
      changes.has('hidden') &&
      !this.hidden &&
      changes.get('hidden') === true
    ) {
      this.fetchRevisions();
    }
  }

  public close(): void {
    this.resetScroll();
    if (this.viewingRevision) {
      this.cancelRevisionView();
    }
    this.fireCustomEvent(CustomEventType.RevisionsClosed);
  }

  public render(): TemplateResult {
    return html`
      <temba-floating-window
        id="revisions-window"
        name="revisions"
        header="Revisions"
        icon="revisions"
        .width=${340}
        .maxHeight=${500}
        .top=${120}
        color="rgb(142, 94, 167)"
        .saving=${this.saving}
        .hidden=${this.hidden}
        @temba-dialog-hidden=${() => this.close()}
      >
        <div class="localization-window-content">
          <div
            class="revisions-list"
            style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; padding-bottom:10px;"
          >
            ${this.isLoading && !this.revisions.length
              ? html`<temba-loading></temba-loading>`
              : this.revisions.map((rev, index) => {
                  const isCurrent = index === 0;
                  const isSelected = this.viewingRevision?.id === rev.id;
                  const summary = summarizeChanges(rev.changes);
                  return html`
                    <div
                      class="revision-item ${isSelected
                        ? 'selected'
                        : ''} ${isCurrent ? 'current' : ''}"
                      style="padding:8px; border-radius:4px; cursor:pointer; background:${isSelected
                        ? '#f0f6ff'
                        : '#f9fafb'}; border:1px solid ${isSelected
                        ? '#a4cafe'
                        : '#e5e7eb'}; transition: all 0.2s ease;"
                      @click=${() => this.handleRevisionClick(rev)}
                    >
                      ${summary
                        ? html`<div
                            class="revision-summary"
                            style="font-size:13px; color:#111827; line-height:1.3;"
                          >
                            ${summary}
                          </div>`
                        : ''}
                      <div
                        class="revision-meta"
                        style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-height:20px; font-size:11px; color:#6b7280; margin-top:${summary
                          ? '2px'
                          : '0'};"
                      >
                        <div style="flex:1; min-width:0;">
                          <temba-date
                            value=${rev.created_on}
                            display="duration"
                          ></temba-date>
                          · ${rev.user.name || rev.user.username}
                        </div>
                        ${isCurrent
                          ? html`<div
                              class="current-label"
                              style="font-size:10px; font-weight:600; text-transform:uppercase; color:#6b7280; background:#e5e7eb; padding:2px 6px; border-radius:10px; letter-spacing:0.5px; flex-shrink:0;"
                            >
                              Current
                            </div>`
                          : isSelected
                            ? html`<button
                                class="revert-button"
                                style="font-size:10px; font-weight:600; text-transform:uppercase; color:#1e3a8a; background:#a4cafe; padding:2px 6px; border-radius:10px; letter-spacing:0.5px; border:none; cursor:pointer; flex-shrink:0;"
                                @click=${(e: Event) => {
                                  e.stopPropagation();
                                  this.handleRevertClick();
                                }}
                              >
                                Revert
                              </button>`
                            : html``}
                      </div>

                      ${rev.comment
                        ? html`<div
                            style="font-size:12px; color:#4b5563; margin-top:4px;"
                          >
                            ${rev.comment}
                          </div>`
                        : ''}
                    </div>
                  `;
                })}
          </div>
        </div>
      </temba-floating-window>
    `;
  }

  // --- Private ---

  private async fetchRevisions() {
    const requestId = ++this.fetchRequestId;
    this.isLoading = true;
    try {
      const results = await fetchResults(
        `/flow/revisions/${this.flow}/?version=${FLOW_SPEC_VERSION}`
      );
      if (requestId !== this.fetchRequestId) return;
      this.revisions = this.collapseRevisions(results);
    } catch (e) {
      if (requestId !== this.fetchRequestId) return;
      console.error('Error fetching revisions', e);
    } finally {
      if (requestId === this.fetchRequestId) {
        this.isLoading = false;
      }
    }
  }

  // Lump revisions made in a continuous editing session (within 15 minutes
  // of each other, by the same author) onto their most recent member,
  // merging the tag sets so the summary covers everything that happened in
  // the window. The merged revision is capped at three distinct displayed
  // labels — once a fourth would be introduced we break out into a new row.
  private collapseRevisions(revisions: Revision[]): Revision[] {
    // The API returns newest-first today; sort defensively so the head/window
    // logic stays correct if that ever changes.
    const sorted = [...revisions].sort(
      (a, b) =>
        new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
    );
    const result: Revision[] = [];
    let group: Revision[] = [];
    let groupLabels = new Set<string>();

    const flush = () => {
      if (group.length === 0) return;
      const head = group[0];
      const tagSet = new Set<string>();
      let anyKnown = false;
      for (const r of group) {
        if (r.changes) {
          anyKnown = true;
          for (const tag of r.changes.tags || []) tagSet.add(tag);
        }
      }
      result.push({
        ...head,
        changes: anyKnown ? { tags: Array.from(tagSet) } : null
      });
      group = [];
      groupLabels = new Set();
    };

    for (const rev of sorted) {
      if (group.length === 0) {
        group.push(rev);
        groupLabels = labelsFor(rev.changes);
        continue;
      }
      const head = group[0];
      const headTime = new Date(head.created_on).getTime();
      const revTime = new Date(rev.created_on).getTime();
      const withinWindow = headTime - revTime < GROUP_WINDOW_MS;
      // Compare on whichever identifier the server provides — real data
      // arrives with `email`, while test fixtures use `username`. Falling
      // back through the chain keeps both shapes working.
      const headId = head.user?.email ?? head.user?.username;
      const revId = rev.user?.email ?? rev.user?.username;
      const sameAuthor = headId === revId;
      const prospective = new Set([
        ...groupLabels,
        ...labelsFor(rev.changes)
      ]);
      const fitsLabelCap = prospective.size <= MAX_GROUP_LABELS;

      if (withinWindow && sameAuthor && fitsLabelCap) {
        group.push(rev);
        groupLabels = prospective;
      } else {
        flush();
        group.push(rev);
        groupLabels = labelsFor(rev.changes);
      }
    }
    flush();
    return result;
  }

  private async handleRevisionClick(revision: Revision) {
    if (this.viewingRevision?.id === revision.id) {
      return;
    }

    const store = getStore().getState();

    if (!this.viewingRevision) {
      this.preRevertState = {
        definition: store.flowDefinition,
        dirtyDate: store.dirtyDate
      };
      this.browseLanguageCode = store.languageCode;
    }

    this.viewingRevision = revision;
    this.isLoading = true;

    this.fireCustomEvent(CustomEventType.RevisionViewed, { revision });

    try {
      await store.fetchRevision(
        `/flow/revisions/${this.flow}`,
        revision.id.toString()
      );
      if (this.browseLanguageCode) {
        store.setLanguageCode(this.browseLanguageCode);
      }
    } catch (e) {
      console.error('Error fetching revision details', e);
      this.cancelRevisionView();
    } finally {
      this.isLoading = false;
    }
  }

  private cancelRevisionView() {
    const store = getStore().getState();
    const preservedLanguageCode = this.browseLanguageCode || store.languageCode;

    if (this.preRevertState) {
      const currentInfo = store.flowInfo;
      store.setFlowContents({
        definition: this.preRevertState.definition,
        info: currentInfo
      });
      if (this.preRevertState.dirtyDate) {
        store.setDirtyDate(this.preRevertState.dirtyDate);
      }
      if (preservedLanguageCode) {
        store.setLanguageCode(preservedLanguageCode);
      }
    } else {
      store.fetchRevision(`/flow/revisions/${this.flow}`).finally(() => {
        if (preservedLanguageCode) {
          store.setLanguageCode(preservedLanguageCode);
        }
      });
    }

    this.viewingRevision = null;
    this.preRevertState = null;
    this.browseLanguageCode = null;
    this.fireCustomEvent(CustomEventType.RevisionCancelled);
  }

  private async handleRevertClick() {
    if (!this.viewingRevision || !this.preRevertState) return;

    const store = getStore().getState();
    const preservedLanguageCode = this.browseLanguageCode || store.languageCode;

    const definitionToSave = {
      ...store.flowDefinition,
      revision: this.preRevertState.definition.revision
    };

    this.viewingRevision = null;
    this.preRevertState = null;
    this.browseLanguageCode = null;

    this.fireCustomEvent(CustomEventType.RevisionReverted, {
      definition: definitionToSave,
      languageCode: preservedLanguageCode
    });
  }

  private resetScroll() {
    const win = this.shadowRoot?.querySelector('temba-floating-window');
    const list = win?.shadowRoot?.querySelector('.body');
    if (list) {
      list.scrollTop = 0;
    }
  }
}
