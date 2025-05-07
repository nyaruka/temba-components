import { html, TemplateResult } from 'lit-html';
import { css, PropertyValueMap, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { FlowDefinition } from '../store/flow-definition';
import { getStore } from '../store/Store';
import { AppState, fromStore, zustand } from '../store/AppState';
import { RapidElement } from '../RapidElement';

import { Plumber } from './Plumber';
import { EditorNode } from './EditorNode';

export class Editor extends RapidElement {
  // Unfortunately, jsplumb requires that we be in light DOM
  createRenderRoot() {
    return this;
  }

  // This is the master plumber
  private plumber: Plumber;

  @property({ type: String })
  public flow: string;

  @property({ type: String })
  public version: string;

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private definition!: FlowDefinition;

  @fromStore(zustand, (state: AppState) => state.canvasSize)
  private canvasSize!: { width: number; height: number };

  static get styles() {
    return css`
      #editor {
        overflow: scroll;
        flex: 1;
      }

      #grid {
        position: relative;
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
        box-shadow: inset -5px 0 10px rgba(0, 0, 0, 0.05);
        border-top: 1px solid #e0e0e0;
        display: inline-block;
      }

      #canvas {
        position: relative;
        padding: 20px;
        margin: 20px;
      }

      body .jtk-endpoint {
        width: initial;
        height: initial;
      }

      .jtk-endpoint {
        z-index: 1;
      }

      .plumb-source {
        z-index: 300;
        border: 0px solid var(--color-connectors);
      }

      .plumb-source.connected {
        box-shadow: 0 3px 3px 0px rgba(0, 0, 0, 0.1);
        border-radius: 50%;
      }

      .plumb-source circle {
        fill: tomato;
      }

      .plumb-source.connected circle {
        fill: #fff;
      }

      .plumb-source svg {
        fill: var(--color-connectors) !important;
        stroke: var(--color-connectors);
      }

      .plumb-target {
        margin-top: -6px;
        z-index: 200;
        opacity: 0;
        cursor: pointer;
      }

      body .plumb-connector path {
        stroke: var(--color-connectors) !important;
        stroke-width: 3px;
      }

      body .plumb-connector .plumb-arrow {
        fill: var(--color-connectors);
        stroke: var(--color-connectors);
        stroke-width: 0px;
        margin-top: 6px;
      }

      body svg.jtk-connector.jtk-hover path {
        stroke: var(--color-success) !important;
        stroke-width: 3px;
      }

      body .plumb-connector.jtk-hover .plumb-arrow {
        fill: var(--color-success) !important;
        stroke-width: 0px;
      }
    `;
  }

  constructor() {
    super();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    this.plumber = new Plumber(this.querySelector('#canvas'));
    if (changes.has('flow')) {
      getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
    }
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('canvasSize')) {
      console.log('Setting canvas size', this.canvasSize);
    }
  }

  public render(): TemplateResult {
    // we have to embed our own style since we are in light DOM
    const style = html`<style>
      ${unsafeCSS(Editor.styles.cssText)}
      ${unsafeCSS(EditorNode.styles.cssText)}
    </style>`;

    return html`${style}
      <div id="editor">
        <div
          id="grid"
          style="width:${this.canvasSize.width}px; height:${this.canvasSize
            .height}px"
        >
          <div id="canvas">
            ${this.definition
              ? this.definition.nodes.map((node) => {
                  return html`<temba-flow-node
                    .plumber=${this.plumber}
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
