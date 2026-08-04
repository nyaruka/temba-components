import { TemplateResult, css, html } from 'lit';
import { msg } from '@lit/localize';
import { property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { FieldElement } from './FieldElement';
import { Icon } from '../Icons';
import { postForm, postFormData } from '../utils';

interface Formatting {
  label: string;
  title: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

/**
 * An editor for markdown source - a formatting toolbar over a plain textarea, screenshot uploads by button, drop or
 * paste, and a preview.
 *
 * The source stays markdown rather than becoming rich text so that what's stored is diffable, portable and cheap to
 * chunk for search. The preview is rendered by the server rather than in the browser: it's the same renderer, and the
 * same sanitizing, that the published article will go through, so an author can't preview something we'd refuse to
 * publish - and we never inject unsanitized HTML of our own making.
 */
export class MarkdownEditor extends FieldElement {
  static get styles() {
    return css`
      ${super.styles}

      .container {
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature-widget);
        box-shadow: var(--widget-box-shadow);
        transition: all ease-in-out var(--transition-speed);
      }

      .container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .toolbar {
        display: flex;
        align-items: center;
        gap: 0.25em;
        padding: 0.35em 0.5em;
        border-bottom: 1px solid var(--color-widget-border);
      }

      .toolbar temba-icon,
      .toolbar .format {
        cursor: pointer;
        padding: 0.15em 0.4em;
        border-radius: var(--curvature);
        color: var(--color-text-dark);
        font-size: 0.85em;
        line-height: 1.4;
      }

      .toolbar .format.bold {
        font-weight: 700;
      }

      .toolbar .format.italic {
        font-style: italic;
      }

      .toolbar temba-icon:hover,
      .toolbar .format:hover {
        background: var(--color-selection);
      }

      .toolbar .spacer {
        flex-grow: 1;
      }

      .toolbar .toggle {
        cursor: pointer;
        font-size: 0.85em;
        color: var(--color-link-primary);
      }

      textarea {
        display: block;
        width: 100%;
        border: none;
        outline: none;
        resize: vertical;
        padding: 0.75em;
        background: transparent;
        font-family: var(--font-family-mono, monospace);
        font-size: 0.9em;
        line-height: 1.5;
        color: var(--color-widget-text);
      }

      .preview {
        padding: 0.75em;
        min-height: 4em;
      }

      .preview img {
        max-width: 100%;
      }

      .uploading {
        opacity: 0.5;
      }

      .error {
        color: var(--color-error);
        padding: 0 0.75em 0.5em 0.75em;
        font-size: 0.85em;
      }
    `;
  }

  /** where screenshots are uploaded, returning {url} to reference from the markdown */
  @property({ type: String })
  endpoint: string;

  /** where markdown is rendered for the preview, returning {html} */
  @property({ type: String, attribute: 'preview_endpoint' })
  previewEndpoint: string;

  @property({ type: String })
  accept = 'image/gif,image/jpeg,image/png,image/webp';

  @property({ type: Number })
  minHeight = 320;

  @property({ type: Boolean })
  previewing = false;

  @property({ type: String })
  preview = '';

  @property({ type: Boolean })
  uploading = false;

  @property({ type: String })
  error = '';

  private previewTimeout: any = null;

  // what the toolbar can wrap the selection in. Everything here is plain markdown, because markdown is what gets
  // stored. Buttons are labelled rather than iconned - the shorthand is universal in editors and needs no new sprite
  // entries. Built per render so the labels pick up the active locale.
  private get formatting(): Formatting[] {
    return [
      { label: 'B', title: msg('Bold'), prefix: '**', suffix: '**' },
      { label: 'I', title: msg('Italic'), prefix: '_', suffix: '_' },
      {
        label: 'H',
        title: msg('Heading'),
        prefix: '## ',
        suffix: '',
        block: true
      },
      {
        label: 'List',
        title: msg('List'),
        prefix: '* ',
        suffix: '',
        block: true
      },
      { label: 'Link', title: msg('Link'), prefix: '[', suffix: '](https://)' },
      { label: 'Code', title: msg('Code'), prefix: '`', suffix: '`' }
    ];
  }

  public get textArea(): HTMLTextAreaElement {
    return this.shadowRoot.querySelector('textarea');
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    // the preview is only ever as fresh as the last pause in typing, so it doesn't post on every keystroke
    if (changes.has('value') || changes.has('previewing')) {
      if (this.previewing) {
        window.clearTimeout(this.previewTimeout);
        this.previewTimeout = window.setTimeout(
          () => this.refreshPreview(),
          400
        );
      }
    }
  }

  private refreshPreview(): void {
    if (!this.previewEndpoint) {
      return;
    }

    postForm(this.previewEndpoint, { body: this.value || '' })
      .then((response) => {
        this.preview = response.json.html;
      })
      .catch(() => {
        this.error = msg('Unable to render preview.');
      });
  }

  private handleInput(evt: any): void {
    this.value = evt.target.value;
    this.fireEvent('change');
  }

  /**
   * Wraps the selection - or inserts placeholder text where there is none - putting the caret somewhere useful either
   * way, since a toolbar that leaves you hunting for the caret is worse than no toolbar.
   */
  private applyFormatting(fmt: Formatting): void {
    const area = this.textArea;
    const text = area.value;
    let start = area.selectionStart;
    const end = area.selectionEnd;

    if (fmt.block) {
      // block formatting applies from the start of the line the selection begins on
      start = text.lastIndexOf('\n', start - 1) + 1;
      this.insert(
        start,
        end,
        fmt.prefix + text.substring(start, end),
        start + fmt.prefix.length
      );
      return;
    }

    const selected = text.substring(start, end);
    this.insert(
      start,
      end,
      fmt.prefix + selected + fmt.suffix,
      selected
        ? end + fmt.prefix.length + fmt.suffix.length
        : start + fmt.prefix.length
    );
  }

  private insert(
    start: number,
    end: number,
    replacement: string,
    caret: number
  ): void {
    const area = this.textArea;

    area.value =
      area.value.substring(0, start) + replacement + area.value.substring(end);
    this.value = area.value;

    area.focus();
    area.setSelectionRange(caret, caret);
    this.fireEvent('change');
  }

  private handleUploadClick(): void {
    (
      this.shadowRoot.querySelector('#upload-input') as HTMLInputElement
    ).click();
  }

  private handleFileInput(evt: any): void {
    this.upload([...evt.target.files]);
    evt.target.value = null;
  }

  private handleDrop(evt: DragEvent): void {
    const files = [...(evt.dataTransfer?.files || [])];
    if (files.length > 0) {
      evt.preventDefault();
      this.upload(files);
    }
  }

  private handlePaste(evt: ClipboardEvent): void {
    // a screenshot on the clipboard arrives as a file with no name, which is the common way to add one
    const files = [...(evt.clipboardData?.items || [])]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file) => !!file);

    if (files.length > 0) {
      evt.preventDefault();
      this.upload(files);
    }
  }

  private upload(files: File[]): void {
    if (!this.endpoint) {
      return;
    }

    this.error = '';
    this.uploading = true;

    // one at a time, in order, so the markdown ends up in the order they were given to us
    const next = (remaining: File[]) => {
      if (remaining.length === 0) {
        this.uploading = false;
        return;
      }

      const data = new FormData();
      data.append('file', remaining[0]);

      postFormData(this.endpoint, data)
        .then((response) => {
          if (response.json.error) {
            this.error = response.json.error;
            this.uploading = false;
            return;
          }

          const area = this.textArea;
          const caret = area.selectionStart;
          this.insert(
            caret,
            area.selectionEnd,
            `![${response.json.name}](${response.json.url})`,
            caret
          );
          next(remaining.slice(1));
        })
        .catch(() => {
          this.error = msg('Unable to upload file.');
          this.uploading = false;
        });
    };

    next(files);
  }

  public render(): TemplateResult {
    return this.renderField();
  }

  protected renderWidget(): TemplateResult {
    return html`
      <div class="container">
        <div class="toolbar">
          ${this.formatting.map(
            (fmt) => html`
              <div
                class="format ${fmt.label === 'B'
                  ? 'bold'
                  : fmt.label === 'I'
                    ? 'italic'
                    : ''}"
                title="${fmt.title}"
                @click=${() => this.applyFormatting(fmt)}
              >
                ${fmt.label}
              </div>
            `
          )}
          <temba-icon
            name="${Icon.attachment}"
            title="${msg('Screenshot')}"
            class="${this.uploading ? 'uploading' : ''}"
            @click=${this.handleUploadClick}
          ></temba-icon>
          <div class="spacer"></div>
          <div
            class="toggle"
            @click=${() => (this.previewing = !this.previewing)}
          >
            ${this.previewing ? msg('Edit') : msg('Preview')}
          </div>
        </div>
        ${this.previewing
          ? html`<div class="preview" style="min-height:${this.minHeight}px">
              ${unsafeHTML(this.preview)}
            </div>`
          : html`<textarea
              name="${this.name}"
              style="min-height:${this.minHeight}px"
              .value=${this.value || ''}
              ?disabled=${this.disabled}
              @input=${this.handleInput}
              @drop=${this.handleDrop}
              @paste=${this.handlePaste}
            ></textarea>`}
        ${this.error ? html`<div class="error">${this.error}</div>` : null}
        <input
          id="upload-input"
          type="file"
          accept="${this.accept}"
          multiple
          style="display:none"
          @change=${this.handleFileInput}
        />
      </div>
    `;
  }
}
