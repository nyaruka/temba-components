import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ContactStoreElement } from './ContactStoreElement';
import { getDisplayName } from './ContactChat';
import { ContactNote, CustomEventType } from '../interfaces';

export class ContactNotepad extends ContactStoreElement {
  @property({ type: Object, attribute: false })
  note: ContactNote;

  @property({ type: String })
  dirtyMessage =
    'You have unsaved changes to the contact notepad. Are you sure you want to contiunue?';

  static get styles() {
    return css`
      :host {
        height: 100%;
        display: flex;
      }

      .wrapper {
        flex-grow: 1;
        --color-widget-bg: transparent;
        --color-widget-bg-focused: transparent;
        outline: none;
        border-radius: var(--curvature);
        display: flex;
        flex-direction: column;
      }

      .notepad {
        flex-grow: 1;
        padding: 1.25rem;
        overflow-y: auto;
        background: transparent;
        border: none;
        outline: none;
        resize: none;
        font-family: monospace;
      }

      .notepad:focus {
        outline: none;
      }

      .toolbar {
        background: rgba(0, 0, 0, 0.03);
        padding: 0.25em 0.5em;
        display: flex;
        min-height: 2em;
        align-items: center;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      }

      .toolbar temba-button {
        margin-right: 0.5em;
      }

      .updated {
        font-size: 0.9em;
        flex-grow: 1;
        margin-left: 0.5em;
      }
    `;
  }

  private handleChange() {
    this.markDirty();
  }

  private submitChanges() {
    const notepad = this.shadowRoot.querySelector(
      '.notepad'
    ) as HTMLInputElement;
    const note = notepad.value;
    this.postChanges({ note }).then(() => {
      this.markClean();
    });
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);

    if (changes.has('data')) {
      this.note =
        this.data?.notes.length > 0
          ? { ...this.data.notes[this.data.notes.length - 1] }
          : null;
      this.fireCustomEvent(CustomEventType.DetailsChanged, {
        count: this.note && this.note.text.length > 0 ? 1 : 0
      });
      this.markClean();
    }
  }

  public render(): TemplateResult {
    if (this.data) {
      return html`
        <div class="wrapper">
          <!-- prettier-ignore -->
          <textarea class="notepad" @input=${this.handleChange} .value=${this
            .note
            ? this.note.text
            : ''}></textarea>
          <div class="toolbar">
            <div class="updated">
              ${this.note
                ? html`Last updated by ${getDisplayName(this.note.created_by)}
                    <temba-date
                      value="${this.note.created_on}"
                      display="duration"
                    ></temba-date>`
                : null}
            </div>
            ${this.dirty
              ? html`
                  <temba-button
                    name="Save"
                    small
                    @click=${this.submitChanges}
                  ></temba-button>
                `
              : null}
          </div>
        </div>
      `;
    }
    return super.render();
  }
}
