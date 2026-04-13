import { html, TemplateResult } from 'lit-html';
import { FlowIssue } from '../store/AppState';
import { FloatingWindow } from '../layout/FloatingWindow';
import { formatIssueMessage } from './utils';
import type { Editor } from './Editor';

export class IssuesWindow {
  constructor(private editor: Editor) {}

  // --- Public API ---

  public open(): void {
    this.editor.issuesWindowHidden = false;
  }

  public close(): void {
    this.editor.issuesWindowHidden = true;
  }

  public get isOpen(): boolean {
    return !this.editor.issuesWindowHidden;
  }

  public handleItemClick(issue: FlowIssue): void {
    const issuesWindow = document.getElementById(
      'issues-window'
    ) as FloatingWindow;
    issuesWindow?.handleClose();
    this.editor.issuesWindowHidden = true;

    this.editor.focusNode(issue.node_uuid);

    const node = this.editor.definition.nodes.find(
      (n) => n.uuid === issue.node_uuid
    );
    if (!node) return;

    if (issue.action_uuid) {
      const action = node.actions?.find((a) => a.uuid === issue.action_uuid);
      if (action) {
        this.editor.editingAction = action;
        this.editor.editingNode = node;
        this.editor.editingNodeUI =
          this.editor.definition._ui.nodes[issue.node_uuid];
      }
    } else {
      this.editor.editingNode = node;
      this.editor.editingNodeUI =
        this.editor.definition._ui.nodes[issue.node_uuid];
    }
  }

  // --- Rendering ---

  public renderTab(): TemplateResult | string {
    if (!this.editor.flowIssues?.length) return '';
    return html`
      <temba-floating-tab
        id="issues-tab"
        icon="alert_warning"
        label="Flow Issues"
        color="tomato"
        order="2"
        .active=${!this.editor.issuesWindowHidden}
        @temba-button-clicked=${() => this.handleTabClick()}
      ></temba-floating-tab>
    `;
  }

  public renderWindow(): TemplateResult | string {
    if (!this.editor.flowIssues?.length) return '';
    return html`
      <temba-floating-window
        id="issues-window"
        name="issues"
        header="Flow Issues"
        icon="alert_warning"
        .width=${360}
        .maxHeight=${600}
        .top=${120}
        color="tomato"
        .hidden=${this.editor.issuesWindowHidden}
        @temba-dialog-hidden=${() => this.close()}
      >
        <div style="display:flex; flex-direction:column; gap:2px;">
          ${this.editor.flowIssues.map(
            (issue) => html`
              <div
                class="issue-list-item"
                @click=${() => this.handleItemClick(issue)}
              >
                <temba-icon name="alert_warning" size="1.2"></temba-icon>
                <span>${formatIssueMessage(issue)}</span>
              </div>
            `
          )}
        </div>
      </temba-floating-window>
    `;
  }

  // --- Private ---

  private handleTabClick(): void {
    if (!this.editor.issuesWindowHidden) {
      this.close();
      return;
    }
    this.editor.closeOpenWindows();
    this.editor.issuesWindowHidden = false;
  }
}
