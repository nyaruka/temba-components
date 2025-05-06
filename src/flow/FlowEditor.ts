import { html, TemplateResult } from 'lit-html';
import { css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { FlowDefinition } from '../store/flow-definition';
import { getStore } from '../store/Store';
import { AppState, fromStore, zustand } from '../store/AppState';
import { RapidElement } from '../RapidElement';

export class FlowEditor extends RapidElement {
  @property({ type: String })
  public flow: string;

  @property({ type: String })
  public version: string;

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private definition!: FlowDefinition;

  static get styles() {
    return css`
      :host {
        flex-grow: 1;
        font-size: 13px;
      }

      .editor {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .canvas {
        overflow: auto;
        padding: 24px;
        box-shadow: inset -5px 0 10px rgba(0, 0, 0, 0.05);
        border-top: 1px solid #e0e0e0;
        flex-grow: 1;
        width: 100%;
        background-color: #f9f9f9;
        background-position: 13px 13px;
        background-image: linear-gradient(
            0deg,
            transparent 24%,
            rgba(61, 177, 255, 0.15) 25%,
            rgba(61, 177, 255, 0.15) 26%,
            transparent 27%,
            transparent 74%,
            rgba(61, 177, 255, 0.15) 75%,
            rgba(61, 177, 255, 0.15) 76%,
            transparent 77%,
            transparent
          ),
          linear-gradient(
            90deg,
            transparent 24%,
            rgba(61, 177, 255, 0.15) 25%,
            rgba(61, 177, 255, 0.15) 26%,
            transparent 27%,
            transparent 74%,
            rgba(61, 177, 255, 0.15) 75%,
            rgba(61, 177, 255, 0.15) 76%,
            transparent 77%,
            transparent
          );
        background-size: 40px 40px;
        position: relative;
      }

      .canvas-positions {
        position: relative;
      }
    `;
  }

  constructor() {
    super();
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('flow')) {
      getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
    }

    if (changes.has('definition')) {
      // console.log('definition updated', this.definition);
      // test update renders
      // if (this.definition) {
      // getStore().getState().setTestUpdate();
      // }
    }
  }

  public render(): TemplateResult {
    return html` <div class="editor">
      <div class="canvas">
        <div class="canvas-positions">
          ${this.definition
            ? this.definition.nodes.map((node) => {
                return html`<temba-flow-node
                  .node=${node}
                  .ui=${this.definition._ui.nodes[node.uuid]}
                ></temba-flow-node>`;
              })
            : html`<temba-loading></temba-loading>`}
        </div>
      </div>
    </div>`;
  }
}
