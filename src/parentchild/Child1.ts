import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { Attachment } from '../compose/Compose';

export const addCurrentAttachment = (index: number): Attachment => {
  const c = 'c' + index;
  const attachment = {
    uuid: c,
    content_type: 'image/png',
    type: 'image/png',
    filename: 'name_' + c,
    url: 'url_' + c,
    size: 1024,
    error: null,
  } as Attachment;
  return attachment;
};

export const addFailedAttachment = (index: number): Attachment => {
  const f = 'f' + index;
  const attachment = {
    uuid: f,
    content_type: 'image/png',
    type: 'image/png',
    filename: 'name_' + f,
    url: 'url_' + f,
    size: 1024,
    error: 'error_' + f,
  } as Attachment;
  return attachment;
};

export class Child1 extends FormElement {
  DEBUG = true;
  DEBUG_UPDATES = true;
  DEBUG_EVENTS = true;

  static get styles() {
    return css``;
  }

  @property({ type: Array })
  currentAttachments: Attachment[] = [];

  @property({ type: Array })
  failedAttachments: Attachment[] = [];

  public constructor() {
    super();
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      this.fireCustomEvent(CustomEventType.ContentChanged, {
        child1CurrentAttachments: this.currentAttachments,
        child1FailedAttachments: this.failedAttachments,
      });
    }
  }

  private handleAddCurrentAttachment() {
    const attachment = addCurrentAttachment(this.currentAttachments.length);
    this.currentAttachments = [...this.currentAttachments, ...[attachment]];
  }

  private handleAddFailedAttachment() {
    const attachment = addFailedAttachment(this.failedAttachments.length);
    this.failedAttachments = [...this.failedAttachments, ...[attachment]];
  }

  public render(): TemplateResult {
    return html` <div class="child1-container">
      <temba-button
        name="Add current attachment"
        @click=${this.handleAddCurrentAttachment}
      ></temba-button>
      <temba-button
        name="Add failed attachment"
        @click=${this.handleAddFailedAttachment}
      ></temba-button>
    </div>`;
  }
}
