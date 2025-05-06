import { css, html } from 'lit';
import { EDITOR_CONFIG, UIConfig } from './config';
import { Action, Node, NodeUI, Router } from '../store/flow-definition';
import { state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';

export class EditorNode extends RapidElement {
  @state()
  private node: Node;

  @state()
  private ui: NodeUI;

  static get styles() {
    return css`
      .node {
        position: absolute;
        background-color: #fff;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        min-width: 200px;
        border-radius: calc(var(--curvature) * 1.5);
        overflow: hidden;
      }

      .action {
        max-width: 200px;
      }

      .action .body {
        padding: 1em;
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

      .categories {
        display: flex;
        flex-direction: row;

      }

      .category {
        margin:-1px -0.5px;
        border: 1px solid #f3f3f3;
        padding: 0.75em;
        flex-grow:1;
      }

      .router .body {
        padding: 0.75em;
      }


      .result-name {
        font-weight: bold;
        display: inline-block;
      }
  }`;
  }

  private renderTitle(config: UIConfig) {
    return html` <div class="title" style="background:${config.color}">
      ${config.name}
    </div>`;
  }

  private renderAction(node: Node, action: Action) {
    const config = EDITOR_CONFIG[action.type];

    if (config) {
      return html`<div class="action ${action.type}">
        ${this.renderTitle(config)}
        <div class="body">
          ${config.render
            ? config.render(node, action)
            : html`<pre>${JSON.stringify(action, null, 2)}</pre>`}
        </div>
      </div>`;
    }
    return html`<div>${action.type}</div>`;
  }

  private renderRouter(router: Router, ui: NodeUI) {
    const config = EDITOR_CONFIG[ui.type];
    if (config) {
      return html`<div class="router">
        ${this.renderTitle(config)}
        ${router.result_name
          ? html`<div class="body">
              Save as
              <div class="result-name">${router.result_name}</div>
            </div>`
          : null}
      </div>`;
    }
  }

  private renderCategories(node: Node) {
    if (!node.router || !node.router.categories) {
      return null;
    }
    const categories = node.router.categories.map((category) => {
      return html`<div class="category">
        <div class="title">${category.name}</div>
      </div>`;
    });

    return html`<div class="categories">${categories}</div>`;
  }

  public render() {
    return html`
      <div
        class="node"
        style="left:${this.ui.position.left}px;top:${this.ui.position.top}px"
      >
        ${this.node.actions.map((actionSpec) => {
          return this.renderAction(this.node, actionSpec);
        })}
        ${this.node.router
          ? this.renderRouter(this.node.router, this.ui)
          : null}
        ${this.renderCategories(this.node)}
      </div>
    `;
  }
}
