import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { RapidElement } from '../RapidElement';
import { Tab } from './Tab';

export class TabPane extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .tabs {
        display: flex;
      }

      .tab {
        padding: 0.5em 1em;
        margin: 0em 0em;
        cursor: pointer;
        display: flex;
        border-radius: var(--curvature);
        border-bottom-right-radius: 0px;
        border-bottom-left-radius: 0px;
        border: 0px solid rgba(0, 0, 0, 0.45);
        color: var(--color-text-dark);
        --icon-color: var(--color-text-dark);
      }

      .tab temba-icon {
        margin-right: 0.4em;
      }

      .tab.selected {
        cursor: default;
        box-shadow: 2px 1px 3px 2px rgba(0, 0, 0, 0.07);
        background: #fff;
      }

      .pane {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: #fff;
        border-radius: var(--curvature);
        box-shadow: 2px 5px 12px 2px rgba(0, 0, 0, 0.09),
          3px 3px 2px 1px rgba(0, 0, 0, 0.05);
        min-height: 0;
      }

      .pane.first {
        border-top-left-radius: 0px;
      }
    `;
  }

  @property({ type: Number })
  index = 0;

  private handleTabClick(event: MouseEvent): void {
    this.index = parseInt(
      (event.currentTarget as HTMLDivElement).dataset.index
    );
    this.requestUpdate('index');
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('index')) {
      if (this.children.length > this.index) {
        for (let i = 0; i < this.children.length; i++) {
          const tab = this.children[i] as Tab;
          tab.selected = i == this.index;

          if (tab.selected) {
            tab.style.display = 'flex';
          } else {
            tab.style.display = 'none';
          }
        }
      }
    }
  }

  public render(): TemplateResult {
    const tabs: Tab[] = [];
    for (const tab of this.children) {
      tabs.push(tab as Tab);
    }

    return html`
      <div class="tabs">
        ${tabs.map(
          (tab, index) => html`
            <div
              @click=${this.handleTabClick}
              data-index=${index}
              class="tab ${index == this.index ? 'selected' : ''}"
            >
              ${tab.icon ? html`<temba-icon name=${tab.icon} />` : null}
              ${tab.name}
            </div>
          `
        )}
      </div>
      <div class="pane ${this.index === 0 ? 'first' : null}">
        <slot></slot>
      </div>
    `;
  }
}
