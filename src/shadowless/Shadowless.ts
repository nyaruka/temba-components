import { customElement, property } from 'lit/decorators';
import { TemplateResult, LitElement } from 'lit';

@customElement('temba-shadowless')
export default class Shadowless extends LitElement {
  createRenderRoot() {
    for (const child of this.childNodes) {
      if ((child as any).className == 'content') {
        return child;
      }
    }

    const root = document.createElement('div');
    root.className = 'content';
    this.appendChild(root);
    return root as any;
  }

  createRenderRoots() {
    const root = document.createElement('div');
    root.className = 'content';
    this.appendChild(root);
    return root;
  }

  @property({ type: Object })
  body: any;

  public render(): TemplateResult {
    return this.body;
  }
}
