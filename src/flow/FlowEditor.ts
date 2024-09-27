import { html, TemplateResult } from 'lit-html';
import { css, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { EndpointMonitorElement } from '../store/EndpointMonitorElement';

export class FlowEditor extends EndpointMonitorElement {
  @property({ type: String })
  flow: string;

  @property({ type: String })
  version: string;

  @property({ type: Boolean })
  loading = true;

  static get styles() {
    return css`
      :host {
        flex-grow: 1;
      }

      .editor {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .canvas {
        overflow: auto;
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
    `;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('flow')) {
      this.store.fetchFlow(this.flow, this.version).then(() => {
        this.loading = false;
      });
    }
  }

  public render(): TemplateResult {
    return html` <div class="editor">
      <div class="canvas">
        ${this.loading
          ? html`<temba-loading></temba-loading>`
          : html`
              ${this.store.getFlowSpec().definition.nodes.map((node) => {
                return html`<temba-flow-node
                  node=${node.uuid}
                ></temba-flow-node>`;
              })}
            `}
      </div>
    </div>`;
  }
}
