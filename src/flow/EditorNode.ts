import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { EDITOR_CONFIG, UIConfig } from './config';
import { Action, Exit, Node, NodeUI, Router } from '../store/flow-definition';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { Plumber } from './Plumber';
import { getStore } from '../store/Store';

export class EditorNode extends RapidElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Object })
  private plumber: Plumber;

  @property({ type: Object })
  private node: Node;

  @property({ type: Object })
  private ui: NodeUI;

  static get styles() {
    return css`

      .node {
        background-color: #fff;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        min-width: 200px;
        border-radius: var(--curvature);
        overflow: hidden;
        color: #333;
        cursor: move;
        user-select: none;

      }

      .node:hover {
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
      }

      .node.dragging {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
        transform: scale(1.02);
        z-index: 1000;
      }
        
      .action {
        max-width: 200px;
        position: relative;
      }

      .action.sortable {
        display: flex;
        align-items: stretch;
      }

      .action .action-content {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
      }

      .action .body {
        padding: 1em;
      }

      .action .drag-handle {
        opacity: 0;
        transition: all 200ms ease-in-out;
        cursor: move;
        background: rgba(0, 0, 0, 0.02);
        max-width:0px;
        position: absolute;
      }

      .action:hover .drag-handle {
        opacity: 0.5;
        padding: 0.25em;
        max-width: 20px;
      }

      .action .drag-handle:hover {
        opacity: 1;
        
      }

      .action .title,
      .router .title {
        display: flex;
        color: #fff;
        padding: 5px 1px;
        text-align: center;
        font-size: 1em;
        font-weight: normal;

      }

      .title .name {
        flex-grow: 1;
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

  constructor() {
    super();
    this.handleActionOrderChanged = this.handleActionOrderChanged.bind(this);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('node')) {
      // make our initial connections
      if (changes.get('node') === undefined) {
        // this.plumber.makeTarget(this.node.uuid);
        for (const exit of this.node.exits) {
          if (!exit.destination_uuid) {
            this.plumber.makeSource(exit.uuid);
          } else {
            this.plumber.connectIds(exit.uuid, exit.destination_uuid);
          }
        }
      }

      const ele = this.parentElement;
      const rect = ele.getBoundingClientRect();

      getStore()
        ?.getState()
        .expandCanvas(
          this.ui.position.left + rect.width,
          this.ui.position.top + rect.height
        );
    }
  }

  private handleActionOrderChanged(event: CustomEvent) {
    const [fromIdx, toIdx] = event.detail.swap;

    // swap our actions
    const newActions = [...this.node.actions];
    const movedAction = newActions.splice(fromIdx, 1)[0];
    newActions.splice(toIdx, 0, movedAction);

    // udate our internal reprensentation, this isn't strictly necessary
    // since the editor will update us from it's definition subscription
    // but it makes testing a lot easier
    this.node = { ...this.node, actions: newActions };

    getStore()
      ?.getState()
      .updateNode(this.node.uuid, { ...this.node, actions: newActions });
  }

  private renderTitle(config: UIConfig) {
    return html`<div class="title" style="background:${config.color}">
      ${this.node?.actions?.length > 1
        ? html`<temba-icon class="drag-handle" name="sort"></temba-icon>`
        : null}

      <div class="name">${config.name}</div>
    </div>`;
  }

  private renderAction(node: Node, action: Action, index: number) {
    const config = EDITOR_CONFIG[action.type];

    if (config) {
      return html`<div
        class="action sortable ${action.type}"
        id="action-${index}"
      >
        <div class="action-content">
          ${this.renderTitle(config)}
          <div class="body">
            ${config.render
              ? config.render(node, action)
              : html`<pre>${action.type}</pre>`}
          </div>
        </div>
      </div>`;
    }
    return html`<div class="action sortable" id="action-${index}">
      ${action.type}
    </div>`;
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
    if (!this.node || !this.ui) {
      return html`<div class="node">Loading...</div>`;
    }

    return html`
      <div
        id="${this.node.uuid}"
        class="node"
        style="left:${this.ui.position.left}px;top:${this.ui.position.top}px"
      >
        ${this.node.actions.length > 0
          ? html`<temba-sortable-list
              dragHandle="drag-handle"
              @temba-order-changed="${this.handleActionOrderChanged}"
            >
              ${this.node.actions.map((actionSpec, index) => {
                return this.renderAction(this.node, actionSpec, index);
              })}
            </temba-sortable-list>`
          : ''}
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
