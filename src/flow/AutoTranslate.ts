import { html, TemplateResult } from 'lit-html';
import { css, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getStore } from '../store/Store';
import { zustand } from '../store/AppState';
import { FlowDefinition } from '../store/flow-definition';
import { TranslationEntry, buildTranslationBundles } from './flow-translations';

interface TranslationModel {
  uuid: string;
  name: string;
}

const MODELS_ENDPOINT = '/api/internal/llms.json';
const ADD_MODEL_URL = '/ai/';

// Max size of the serialized JSON payload per translate request. Keeps the
// LLM's output comfortably below its token limit. Measured against the full
// payload (uuids, keys, JSON structural chars, and source strings).
const TRANSLATION_BATCH_CHAR_LIMIT = 10000;

export class AutoTranslate extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: contents;
      }

      .auto-translate-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px;
        font-size: 14px;
        color: #374151;
      }

      .auto-translate-body p {
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
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13px;
      }

      .auto-translate-empty a {
        color: var(--color-link);
        text-decoration: none;
      }

      .auto-translate-empty a:hover {
        text-decoration: underline;
      }

      .auto-translate-single-model {
        font-size: 13px;
      }

      .auto-translate-status {
        display: flex;
        align-items: center;
        gap: 6px;
        /* align with the progress bar in the body (body has 20px padding,
           dialog-footer has 10px) */
        padding-left: 10px;
        font-size: 12px;
        color: #6b7280;
      }

      .auto-translate-status-spinner {
        --icon-color: #6b7280;
      }

      .auto-translate-error-block {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px 14px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        overflow: hidden;
        font-size: 13px;
        color: #7f1d1d;
      }

      .auto-translate-error-block p {
        margin: 0;
      }

      .auto-translate-error-help {
        color: inherit;
      }

      .auto-translate-error-toggle {
        align-self: flex-start;
        margin-top: 2px;
        padding: 0;
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        font-size: 12px;
        text-decoration: underline;
        cursor: pointer;
      }

      .auto-translate-error-details {
        margin: 6px -14px -12px;
        padding: 10px 14px;
        background: #fff;
        border-top: 1px solid #fecaca;
        font-size: 12px;
        color: inherit;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `;
  }

  @property({ attribute: false })
  definition: FlowDefinition | null = null;

  @property({ type: String, attribute: 'language-code' })
  languageCode = '';

  @property({ type: Boolean })
  disabled = false;

  // Reactive flag the host can read to show "translating" state in UI
  // adjacent to this component (e.g. the toolbar button).
  @property({ type: Boolean, reflect: true })
  running = false;

  @state()
  dialogOpen = false;

  @state()
  models: TranslationModel[] = [];

  @state()
  modelsLoading = false;

  @state()
  selectedModel: TranslationModel | null = null;

  @state()
  progress: { done: number; total: number } = { done: 0, total: 0 };

  @state()
  error: string | null = null;

  @state()
  errorExpanded = false;

  @state()
  interrupt = false;

  /**
   * Public entry point. If a translation is in flight, sets the interrupt
   * flag; otherwise opens the model picker.
   */
  public async start(): Promise<void> {
    if (this.disabled) {
      return;
    }

    if (this.running) {
      this.interrupt = true;
      return;
    }

    this.error = null;
    this.errorExpanded = false;
    this.selectedModel = null;
    this.dialogOpen = true;
    await this.loadModels();

    if (this.models.length === 1) {
      this.selectedModel = this.models[0];
    }
  }

  private async loadModels(): Promise<void> {
    this.modelsLoading = true;
    try {
      const store = getStore();
      const results = store
        ? await store.getResults(MODELS_ENDPOINT, { force: true })
        : [];
      this.models = (results || []).map((r: any) => ({
        uuid: r.uuid,
        name: r.name
      }));
    } catch (err) {
      console.error('Failed to load AI models', err);
      this.models = [];
      this.error = 'Unable to load AI models.';
    } finally {
      this.modelsLoading = false;
    }
  }

  private handleModelChange(event: Event): void {
    const select = event.target as any;
    const next = select?.values?.[0];
    this.selectedModel = next ? { uuid: next.uuid, name: next.name } : null;
  }

  private confirmTranslate(): void {
    if (!this.selectedModel) {
      return;
    }
    this.dialogOpen = false;
    this.runAutoTranslation().catch((err) => {
      console.error('Auto translation failed', err);
      this.error = 'Auto translation failed. Please try again.';
      this.running = false;
    });
  }

  private cancelDialog(): void {
    this.dialogOpen = false;
  }

  private dismissError(): void {
    this.error = null;
    this.errorExpanded = false;
    this.progress = { done: 0, total: 0 };
  }

  /**
   * Builds batches of translation requests from all untranslated entries,
   * grouping so each request's serialized payload stays under
   * TRANSLATION_BATCH_CHAR_LIMIT.
   */
  private buildTranslationBatches(): {
    keyToEntries: Map<string, TranslationEntry[]>;
    batches: { items: Record<string, string[]> }[];
  } {
    const keyToEntries = new Map<string, TranslationEntry[]>();
    const batches: { items: Record<string, string[]> }[] = [];

    if (!this.definition) {
      return { keyToEntries, batches };
    }

    const bundles = buildTranslationBundles(this.definition, this.languageCode);
    const pending: { key: string; entry: TranslationEntry }[] = [];

    for (const bundle of bundles) {
      for (const entry of bundle.translations) {
        if (entry.to && entry.to.trim().length > 0) {
          continue;
        }
        if (!entry.from || entry.from.trim().length === 0) {
          continue;
        }
        const key = `${entry.uuid}:${entry.attribute}`;
        pending.push({ key, entry });
        const list = keyToEntries.get(key) || [];
        list.push(entry);
        keyToEntries.set(key, list);
      }
    }

    const source = this.definition.language;
    const target = this.languageCode;
    const measurePayload = (items: Record<string, string[]>): number =>
      JSON.stringify({ source, target, items }).length;

    let current: Record<string, string[]> = {};

    for (const { key, entry } of pending) {
      const prevList = current[key];
      const nextList = prevList ? [...prevList, entry.from] : [entry.from];
      const tentative = { ...current, [key]: nextList };

      const tentativeSize = measurePayload(tentative);
      const batchHasItems = Object.keys(current).length > 0;

      if (tentativeSize > TRANSLATION_BATCH_CHAR_LIMIT && batchHasItems) {
        // a single oversized entry still ships on its own
        batches.push({ items: current });
        current = { [key]: [entry.from] };
      } else {
        current = tentative;
      }
    }

    if (Object.keys(current).length > 0) {
      batches.push({ items: current });
    }

    return { keyToEntries, batches };
  }

  /**
   * Drives the batch loop. Public so tests can invoke directly with a
   * pre-set selectedModel.
   */
  public async runAutoTranslation(): Promise<void> {
    if (
      !this.definition ||
      !this.selectedModel ||
      this.languageCode === this.definition.language
    ) {
      return;
    }

    const { keyToEntries, batches } = this.buildTranslationBatches();
    if (batches.length === 0) {
      return;
    }

    this.running = true;
    this.interrupt = false;
    this.progress = { done: 0, total: batches.length };

    const source = this.definition.language;
    const target = this.languageCode;
    const url = `/llm/translate/${this.selectedModel.uuid}/`;
    const store = getStore();
    if (!store) {
      this.running = false;
      return;
    }

    for (let i = 0; i < batches.length; i++) {
      if (this.interrupt) {
        break;
      }

      try {
        const response = await store.postJSON(url, {
          source,
          target,
          items: batches[i].items
        });

        if (response.status >= 200 && response.status < 300) {
          const returned: Record<string, string[]> = response.json?.items || {};
          this.applyBatchTranslations(returned, keyToEntries);
        } else {
          this.error =
            response.json?.error ||
            `Translate request failed (${response.status}).`;
          break;
        }
      } catch (err) {
        console.error('Translate request failed', err);
        this.error = 'Translate request failed.';
        break;
      }

      this.progress = { done: i + 1, total: batches.length };
    }

    this.running = false;
    this.interrupt = false;
  }

  private applyBatchTranslations(
    returned: Record<string, string[]>,
    keyToEntries: Map<string, TranslationEntry[]>
  ): void {
    const store = getStore();
    if (!store || !this.definition) {
      return;
    }

    // group updates by uuid so multiple attributes merge into one write
    const updatesByUuid = new Map<string, Record<string, any>>();

    for (const [key, values] of Object.entries(returned)) {
      const entries = keyToEntries.get(key);
      if (!entries || entries.length === 0) {
        continue;
      }
      const [firstEntry] = entries;
      const uuid = firstEntry.uuid;
      const attribute = firstEntry.attribute;

      keyToEntries.delete(key);

      if (!values || values.length === 0) {
        continue;
      }

      const existing =
        this.definition.localization?.[this.languageCode]?.[uuid] || {};
      const merged = updatesByUuid.get(uuid) || { ...existing };
      merged[attribute] = values;
      updatesByUuid.set(uuid, merged);
    }

    for (const [uuid, merged] of updatesByUuid.entries()) {
      store.getState().updateLocalization(this.languageCode, uuid, merged);
      zustand.getState().markAutoTranslated(
        this.languageCode,
        uuid,
        Object.keys(merged).filter(
          (k) => merged[k] && (merged[k] as any[]).length > 0
        )
      );
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('running')) {
      // emit a state-change event so the host can update adjacent UI
      // (e.g. toolbar button) without polling
      this.dispatchEvent(
        new CustomEvent('temba-auto-translate-changed', {
          detail: { running: this.running },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private handleDialogButton(event: CustomEvent): void {
    const name = event.detail?.button?.name;
    if (this.error) {
      // only the Dismiss button shows in the error state
      this.dismissError();
      return;
    }
    if (this.running) {
      // only the Stop button shows while running
      if (!this.interrupt) {
        this.interrupt = true;
      }
      return;
    }
    if (name === 'Translate') {
      this.confirmTranslate();
    } else {
      this.cancelDialog();
    }
  }

  public render(): TemplateResult | string {
    const showPicker = this.dialogOpen;
    const showProgress = this.running || !!this.error;
    const open = showPicker || showProgress;

    if (!open) {
      return '';
    }

    let header: string;
    let body: TemplateResult;
    let gutter: TemplateResult | string = '';
    let primary = '';
    let cancel = '';
    let disabled = false;

    if (this.error) {
      header = 'Problem with AI Model';
      body = this.renderErrorBody();
      cancel = 'Dismiss';
    } else if (this.running) {
      header = 'Auto Translation';
      body = this.renderRunningBody();
      gutter = this.renderRunningGutter();
      // Stop is the primary so the dialog does NOT auto-close on click;
      // we close it ourselves once the in-flight batch returns
      primary = 'Stop';
      disabled = this.interrupt;
    } else {
      header = 'Auto Translation';
      const noModels = !this.modelsLoading && this.models.length === 0;
      body = this.renderPickerBody();
      cancel = noModels ? 'Close' : 'Cancel';
      primary = noModels ? '' : 'Translate';
      disabled = this.modelsLoading || noModels || !this.selectedModel;
    }

    return html`
      <temba-dialog
        header=${header}
        .open=${open}
        size="small"
        primaryButtonName=${primary}
        cancelButtonName=${cancel}
        ?disabled=${disabled}
        variant="flat"
        @temba-button-clicked=${this.handleDialogButton}
      >
        <div class="auto-translate-body">${body}</div>
        ${gutter ? html`<div slot="gutter">${gutter}</div>` : ''}
      </temba-dialog>
    `;
  }

  private renderPickerBody(): TemplateResult {
    if (this.modelsLoading) {
      return html`<div class="auto-translate-loading">
        <temba-loading units="3" size="8"></temba-loading>
      </div>`;
    }

    if (this.models.length === 0) {
      return html`
        <div class="auto-translate-empty">
          <p>You need to add an AI model before you can auto translate.</p>
          <p>
            <a href="${ADD_MODEL_URL}" target="_blank" rel="noopener"
              >Manage AI models</a
            >
          </p>
        </div>
      `;
    }

    const selected = this.selectedModel ? [this.selectedModel] : [];
    return html`
      <p>
        Untranslated text will be sent to the selected AI model and the
        responses saved automatically.
      </p>
      ${this.models.length > 1
        ? html`<temba-select
            class="auto-translate-model-select"
            endpoint="${MODELS_ENDPOINT}"
            valueKey="uuid"
            .values=${selected}
            ?searchable=${true}
            placeholder="Select an AI model"
            @change=${this.handleModelChange}
          ></temba-select>`
        : html`<div class="auto-translate-single-model">
            Using <strong>${this.models[0]?.name}</strong>
          </div>`}
    `;
  }

  private renderRunningBody(): TemplateResult {
    const { done, total } = this.progress;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return html`
      <temba-progress
        .total=${total}
        .current=${done}
        .pct=${pct}
        showPercentage
      ></temba-progress>
    `;
  }

  private renderRunningGutter(): TemplateResult {
    const { done, total } = this.progress;
    // current batch is 1-indexed: while batch 0 is in flight, done is still
    // 0, so we display "1 of N"
    const currentBatch = Math.min(done + 1, total);
    const statusText = this.interrupt
      ? 'Stopping...'
      : total > 1
        ? `Translating ${currentBatch} of ${total}`
        : 'Translating';

    return html`
      <div class="auto-translate-status">
        <temba-icon
          class="auto-translate-status-spinner"
          name="progress_spinner"
          size="0.9"
          spin
        ></temba-icon>
        <span>${statusText}</span>
      </div>
    `;
  }

  private renderErrorBody(): TemplateResult {
    return html`
      <div class="auto-translate-error-block">
        <p class="auto-translate-error-help">
          Any translations already applied have been kept. You can try again,
          or check the AI model's settings if the problem persists.
        </p>
        ${this.errorExpanded
          ? html`<pre class="auto-translate-error-details">
${this.error}</pre
            >`
          : html`<button
              class="auto-translate-error-toggle"
              type="button"
              @click=${() => (this.errorExpanded = true)}
            >
              Show details
            </button>`}
      </div>
    `;
  }
}
