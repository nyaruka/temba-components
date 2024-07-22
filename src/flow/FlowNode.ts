import { css, html } from 'lit';
import { ActionSpec, NodeSpec, NodeUISpec } from './interfaces';
import { UI_CONFIG } from './config';
import { property } from 'lit/decorators.js';
import { StoreElement } from '../store/StoreElement';

export class FlowNode extends StoreElement {
  @property({ type: String, attribute: 'node' })
  public uuid: string;

  static get styles() {
    return css`
      .node {
        position: absolute;
        background-color: #fff;
        border: 1px solid #e0e0e0;
        min-width: 200px;
        border-radius: calc(var(--curvature) * 1.5);
        overflow: hidden;
      }

      .action {
        max-width: 200px;
      }

      .action .body {
        padding: 1em;
        font-size: 0.9em;
      }

      .action .title,
      .router .title {
        color: #fff;
        padding: 5px 1px;
        text-align: center;
      }

      .quick-replies {
        margin-top: 0.5em;
      }

      .quick-reply {
        background-color: #f0f0f0;
        border: 1px solid #e0e0e0;
        border-radius: calc(var(--curvature) * 1.5);
        padding: 0.2em 1em;
        display: inline-block;
        font-size: 0.8em;
        margin: 0.2em;
      }
    `;
  }

  private renderTitle(config: any) {
    return html` <div class="title" style="background:${config.color}">
      ${config.name}
    </div>`;
  }

  private renderAction(nodeSpec: NodeSpec, actionSpec: ActionSpec) {
    const config = UI_CONFIG[actionSpec.type];

    if (config) {
      return html`<div class="action ${actionSpec.type}">
        ${this.renderTitle(config)}
        <div class="body">
          ${config.render
            ? config.render(nodeSpec, actionSpec)
            : html`<pre>${JSON.stringify(actionSpec, null, 2)}</pre>`}
        </div>
      </div>`;
    }
    return html`<div>${actionSpec.type}</div>`;
  }

  private renderRouter(router: any, ui: NodeUISpec) {
    const config = UI_CONFIG[ui.type];
    if (config) {
      return html`<div class="router">${this.renderTitle(config)}</div>`;
    }
  }

  public render() {
    const ui = this.store.getNodeUI(this.uuid);
    const nodeSpec = this.store.getFlowNode(this.uuid);
    return html`
      <div
        class="node"
        style="left:${ui.position.left}px;top:${ui.position.top}px"
      >
        ${nodeSpec.actions.map((actionSpec) => {
          return this.renderAction(nodeSpec, actionSpec);
        })}
        ${nodeSpec.router ? this.renderRouter(nodeSpec.router, ui) : null}
      </div>
    `;
  }
}
