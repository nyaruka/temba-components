import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { Attachment } from '../attachments/attachments';
import { Child1, addCurrentAttachment, addFailedAttachment } from './Child1';
import { Child2 } from './Child2';
import { property } from 'lit/decorators.js';

export class Parent extends FormElement {
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

  public firstUpdated(changes: Map<string, any>): void {
    super.firstUpdated(changes);

    const currentAttachment = addCurrentAttachment(
      this.currentAttachments.length
    );
    this.currentAttachments = [
      ...this.currentAttachments,
      ...[currentAttachment],
    ];

    const failedAttachment = addFailedAttachment(this.failedAttachments.length);
    this.failedAttachments = [...this.failedAttachments, ...[failedAttachment]];
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (changes.has('currentAttachments') || changes.has('failedAttachments')) {
      const child1 = this.shadowRoot.querySelector('temba-child1') as Child1;
      if (child1) {
        child1.currentAttachments = this.currentAttachments;
        child1.failedAttachments = this.failedAttachments;
      }

      const child2 = this.shadowRoot.querySelector('temba-child2') as Child2;
      if (child2) {
        child2.currentAttachments = this.currentAttachments;
        child2.failedAttachments = this.failedAttachments;
      }
    }
  }

  private handleChild1Added(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;
  }

  private handleChild2Removed(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.currentAttachments;
    this.failedAttachments = evt.detail.failedAttachments;
  }

  public render(): TemplateResult {
    return html`
      <div class="parent-container">
        ${this.getChild1()} ${this.getChild2()}
      </div>
    `;
  }

  private getChild1(): TemplateResult {
    return html`
      <temba-child1
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        @temba-content-changed=${this.handleChild1Added}
      >
      </temba-child1>
    `;
  }

  private getChild2(): TemplateResult {
    return html`
      <temba-child2
        .currentAttachments="${this.currentAttachments}"
        .failedAttachments="${this.failedAttachments}"
        @temba-content-changed=${this.handleChild2Removed}
      >
      </temba-child2>
    `;
  }
}
