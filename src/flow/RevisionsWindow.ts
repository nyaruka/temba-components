import { html, TemplateResult } from 'lit-html';
import { css, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { CustomEventType } from '../interfaces';
import { getStore } from '../store/Store';
import { FlowDefinition } from '../store/flow-definition';
import { fetchResults } from '../utils';
import { FLOW_SPEC_VERSION } from '../store/AppState';

export interface Revision {
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

  public get isViewingRevision(): boolean {
    return this.viewingRevision !== null;
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
        .width=${240}
        .maxHeight=${400}
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
              : this.revisions.map((rev) => {
                  const isSelected = this.viewingRevision?.id === rev.id;
                  return html`
                    <div
                      class="revision-item ${isSelected ? 'selected' : ''}"
                      style="padding:8px; border-radius:4px; cursor:pointer; background:${isSelected
                        ? '#f0f6ff'
                        : '#f9fafb'}; border:1px solid ${isSelected
                        ? '#a4cafe'
                        : '#e5e7eb'}; transition: all 0.2s ease;"
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
                            <temba-date
                              value=${rev.created_on}
                              display="duration"
                            ></temba-date>
                          </div>
                          <div style="font-size:11px; color:#6b7280;">
                            ${rev.user.name || rev.user.username}
                          </div>
                        </div>
                        ${isSelected
                          ? html`<button
                              class="revert-button"
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
    this.isLoading = true;
    try {
      const results = await fetchResults(
        `/flow/revisions/${this.flow}/?version=${FLOW_SPEC_VERSION}`
      );
      this.revisions = results.slice(1);
    } catch (e) {
      console.error('Error fetching revisions', e);
    } finally {
      this.isLoading = false;
    }
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
    const preservedLanguageCode =
      this.browseLanguageCode || store.languageCode;

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
    const preservedLanguageCode =
      this.browseLanguageCode || store.languageCode;

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
