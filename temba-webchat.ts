import { Chat } from './src/components/communication/chat/Chat';
import { VectorIcon } from './src/shared/vectoricon/VectorIcon';
import { WebChat } from './src/components/communication/webchat/WebChat';

export function addCustomElement(name: string, comp: any) {
  if (!window.customElements.get(name)) {
    window.customElements.define(name, comp);
  }
}

addCustomElement('temba-icon', VectorIcon);
addCustomElement('temba-chat', Chat);
addCustomElement('temba-webchat', WebChat);
