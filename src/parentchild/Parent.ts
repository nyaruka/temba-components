import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { Child1, addCurrentAttachment, addFailedAttachment } from './Child1';
import { Child2 } from './Child2';
import { property } from 'lit/decorators.js';
import { Attachment } from '../compose/Compose';

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

    const initialCurrentAttachment = addCurrentAttachment(0);
    this.currentAttachments = [initialCurrentAttachment];
    const initialFailedAttachment = addFailedAttachment(0);
    this.failedAttachments = [initialFailedAttachment];

    // console.log('Parent - firstUpdated - this.currentAttachments', this.currentAttachments.length);
    // console.log('Parent - firstUpdated - this.failedAttachments', this.failedAttachments.length);

    const child1 = this.shadowRoot.querySelector('temba-child1') as Child1;
    const child2 = this.shadowRoot.querySelector('temba-child2') as Child2;

    // console.log('Parent - firstUpdated - child1.currentAttachments before', child1.currentAttachments.length);
    // console.log('Parent - firstUpdated - child1.failedAttachments before', child1.failedAttachments.length);
    // console.log('Parent - firstUpdated - child2.currentAttachments before', child2.currentAttachments.length);
    // console.log('Parent - firstUpdated - child2.failedAttachments before', child2.failedAttachments.length);

    child1.currentAttachments = this.currentAttachments;
    child1.failedAttachments = this.failedAttachments;
    child2.currentAttachments = this.currentAttachments;
    child2.failedAttachments = this.failedAttachments;

    // console.log('Parent - firstUpdated - child1.currentAttachments after', child1.currentAttachments.length);
    // console.log('Parent - firstUpdated - child1.failedAttachments after', child1.failedAttachments.length);
    // console.log('Parent - firstUpdated - child2.currentAttachments after', child2.currentAttachments.length);
    // console.log('Parent - firstUpdated - child2.failedAttachments after', child2.failedAttachments.length);
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    // const child1 = this.shadowRoot.querySelector('temba-child1') as Child1;
    // const child2 = this.shadowRoot.querySelector('temba-child2') as Child2;
    // console.log('Parent - updated - this.currentAttachments', this.currentAttachments.length);
    // console.log('Parent - updated - this.failedAttachments', this.failedAttachments.length);
    // console.log('Parent - updated - child1.currentAttachments', child1.currentAttachments.length);
    // console.log('Parent - updated - child1.failedAttachments', child1.failedAttachments.length);
    // console.log('Parent - updated - child2.currentAttachments', child2.currentAttachments.length);
    // console.log('Parent - updated - child2.failedAttachments', child2.failedAttachments.length);
  }

  private handleChild1Added(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.child1CurrentAttachments;
    this.failedAttachments = evt.detail.child1FailedAttachments;
  }

  private handleChild2Removed(evt: CustomEvent): void {
    this.currentAttachments = evt.detail.child2CurrentAttachments;
    this.failedAttachments = evt.detail.child2FailedAttachments;
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
