import { html, TemplateResult } from 'lit-html';
import { getStore } from '../store/Store';
import { FlowDefinition } from '../store/flow-definition';
import { FloatingWindow } from '../layout/FloatingWindow';
import { fetchResults } from '../utils';
import { FLOW_SPEC_VERSION } from '../store/AppState';
import type { Editor } from './Editor';

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

export class RevisionsWindow {
  private revisions: Revision[] = [];
  private viewingRevision: Revision | null = null;
  private isLoading = false;
  private preRevertState: {
    definition: FlowDefinition;
    dirtyDate: Date | null;
  } | null = null;
  private browseLanguageCode: string | null = null;

  constructor(private editor: Editor) {}

  // --- Public API ---

  public get isOpen(): boolean {
    return !this.editor.revisionsWindowHidden;
  }

  public get isViewingRevision(): boolean {
    return this.viewingRevision !== null;
  }

  public open(): void {
    this.editor.closeOpenWindows();
    this.fetchRevisions();
    this.editor.revisionsWindowHidden = false;
  }

  public close(): void {
    this.resetScroll();
    this.editor.revisionsWindowHidden = true;
    if (this.viewingRevision) {
      this.cancelRevisionView();
    }
  }

  // --- Rendering ---

  public renderWindow(): TemplateResult | string {
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
        .saving=${this.editor.isSaving}
        .hidden=${this.editor.revisionsWindowHidden}
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
                        ? '#f0f6ff' // Light blue bg for selected
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
                              @click=${() => this.handleRevertClick()}
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
    this.editor.requestUpdate();
    try {
      const results = await fetchResults(
        `/flow/revisions/${this.editor.flow}/?version=${FLOW_SPEC_VERSION}`
      );
      this.revisions = results.slice(1);
    } catch (e) {
      console.error('Error fetching revisions', e);
    } finally {
      this.isLoading = false;
      this.editor.requestUpdate();
    }
  }

  private async handleRevisionClick(revision: Revision) {
    if (this.viewingRevision?.id === revision.id) {
      return;
    }

    if (!this.viewingRevision) {
      this.preRevertState = {
        definition: this.editor.definition,
        dirtyDate: this.editor.dirtyDate
      };
      this.browseLanguageCode = this.editor.languageCode;
    }

    this.viewingRevision = revision;
    this.editor.closeFlowSearch();
    this.isLoading = true;
    this.editor.plumber?.reset();
    this.editor.requestUpdate();

    try {
      await getStore()
        .getState()
        .fetchRevision(
          `/flow/revisions/${this.editor.flow}`,
          revision.id.toString()
        );
      if (this.browseLanguageCode) {
        this.editor.handleLanguageChange(this.browseLanguageCode);
      }
    } catch (e) {
      console.error('Error fetching revision details', e);
      this.cancelRevisionView();
    } finally {
      this.isLoading = false;
      this.editor.requestUpdate();
    }
  }

  private cancelRevisionView() {
    this.editor.plumber?.reset();
    const preservedLanguageCode =
      this.browseLanguageCode || this.editor.languageCode;
    if (this.preRevertState) {
      const currentInfo = getStore().getState().flowInfo;
      getStore().getState().setFlowContents({
        definition: this.preRevertState.definition,
        info: currentInfo
      });
      if (this.preRevertState.dirtyDate) {
        getStore().getState().setDirtyDate(this.preRevertState.dirtyDate);
      }
      if (preservedLanguageCode) {
        this.editor.handleLanguageChange(preservedLanguageCode);
      }
    } else {
      getStore()
        .getState()
        .fetchRevision(`/flow/revisions/${this.editor.flow}`)
        .finally(() => {
          if (preservedLanguageCode) {
            this.editor.handleLanguageChange(preservedLanguageCode);
          }
        });
    }

    this.viewingRevision = null;
    this.preRevertState = null;
    this.browseLanguageCode = null;
    this.editor.requestUpdate();
  }

  private async handleRevertClick() {
    if (!this.viewingRevision || !this.preRevertState) return;
    this.editor.plumber?.reset();
    const preservedLanguageCode =
      this.browseLanguageCode || this.editor.languageCode;

    const definitionToSave = {
      ...this.editor.definition,
      revision: this.preRevertState.definition.revision
    };

    await this.editor.saveChanges(definitionToSave);
    this.viewingRevision = null;
    this.preRevertState = null;
    this.editor.revisionsWindowHidden = true;

    const revisionsWindow = document.getElementById(
      'revisions-window'
    ) as FloatingWindow;
    revisionsWindow.handleClose();

    this.fetchRevisions();

    getStore()
      .getState()
      .fetchRevision(`/flow/revisions/${this.editor.flow}`)
      .finally(() => {
        if (preservedLanguageCode) {
          this.editor.handleLanguageChange(preservedLanguageCode);
        }
      });
    this.browseLanguageCode = null;
  }

  private resetScroll() {
    const list = this.editor
      .querySelector('#revisions-window')
      ?.shadowRoot?.querySelector('.body');
    if (list) {
      list.scrollTop = 0;
    }
  }
}
