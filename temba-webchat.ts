import { VectorIcon } from './src/vectoricon/VectorIcon';
import { WebChat } from './src/webchat/WebChat';

export function addCustomElement(name: string, comp: any) {
  if (!window.customElements.get(name)) {
    window.customElements.define(name, comp);
  }
}

addCustomElement('temba-icon', VectorIcon);
addCustomElement('temba-webchat', WebChat);
