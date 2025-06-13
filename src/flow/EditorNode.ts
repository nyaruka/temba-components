import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { EDITOR_CONFIG, UIConfig } from './config';
import { Action, Exit, Node, NodeUI, Router } from '../store/flow-definition';
import { state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { Plumber } from './Plumber';
import { getStore } from '../store/Store';

export class EditorNode extends RapidElement {
  createRenderRoot() {
    return this;
  }

  @state()
  private plumber: Plumber;

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
        color: #333;
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
        font-size: 1em;
        font-weight: normal;
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
        text-align: center;
      }

      .action-exits {
        padding-bottom: 0.75em;
        margin-top: -0.75em;
      }

      .category .title {
        font-weight: normal;
        font-size: 1em;
      }

      .router .body {
        padding: 0.75em;
      }

      .result-name {
        font-weight: bold;
        display: inline-block;
      }
      
      .exit {
        padding-top: 10px;
        margin-bottom: -10px;
      }
  }`;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('node')) {
      this.plumber.makeTarget(this.node.uuid);

      // our node was changed, see if we have new destinations
      for (const exit of this.node.exits) {
        if (!exit.destination_uuid) {
          this.plumber.makeSource(exit.uuid);
        } else {
          this.plumber.connectIds(exit.uuid, exit.destination_uuid);
        }
      }

      const ele = this.querySelector('.node');
      const rect = ele.getBoundingClientRect();

      getStore()
        .getState()
        .expandCanvas(
          this.ui.position.left + rect.width,
          this.ui.position.top + rect.height
        );
    }
  }

  private renderTitle(config: UIConfig) {
    return html`<div class="title" style="background:${config.color}">
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
            : html`<pre>${action.type}</pre>`}
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
      const exit = node.exits.find(
        (exit: Exit) => exit.uuid == category.exit_uuid
      );

      return html`<div class="category">
        <div class="title">${category.name}</div>
        ${this.renderExit(exit)}
      </div>`;
    });

    return html`<div class="categories">${categories}</div>`;
  }

  private renderExit(exit: Exit): TemplateResult {
    return html`<div
      id="${exit.uuid}"
      class=${getClasses({
        exit: true,
        connected: !!exit.destination_uuid
      })}
    ></div>`;
  }

  public render() {
    return html`
      <div
        id="${this.node.uuid}"
        class="node"
        style="left:${this.ui.position.left}px;top:${this.ui.position.top}px"
      >
        ${this.node.actions.map((actionSpec) => {
          return this.renderAction(this.node, actionSpec);
        })}
        ${this.node.router
          ? html` ${this.renderRouter(this.node.router, this.ui)}
            ${this.renderCategories(this.node)}`
          : html`<div class="action-exits">
              ${this.node.exits.map((exit) => {
                return this.renderExit(exit);
              })}
            </div>`}
      </div>
    `;
  }
}
