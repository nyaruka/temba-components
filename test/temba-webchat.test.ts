import { useFakeTimers } from 'sinon';
import { WebChat } from '../src/webchat/WebChat';
import {
  assertScreenshot,
  getClip,
  getComponent,
  mockNow
} from '../test/utils.test';
import { expect, assert } from '@open-wc/testing';
import { stub, SinonStub } from 'sinon';
import * as utils from '../src/utils';

let clock: any;
mockNow('2021-03-31T00:31:00.000-00:00');

const TAG = 'temba-webchat';

const getWebChat = async (attrs: any = {}) => {
  const webChat = (await getComponent(
    TAG,
    attrs,
    '',
    400,
    600
  )) as WebChat;
  
  return webChat;
};

// Mock WebSocket
class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 0;
  public url: string;
  public sentMessages: string[] = [];
  public autoOpen: boolean = true;
  
  constructor(url: string) {
    this.url = url;
    // Only auto-open if enabled
    if (this.autoOpen) {
      setTimeout(() => {
        this.readyState = 1; // OPEN
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, 0);
    }
  }
  
  send(data: string) {
    this.sentMessages.push(data);
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  // Test helper to manually open connection
  manualOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
  
  // Test helper to simulate incoming messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  // Test helper to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('temba-webchat', () => {
  let originalWebSocket: any;
  let mockWebSocket: MockWebSocket;
  let webSocketStub: SinonStub;
  let cookieStub: SinonStub;

  beforeEach(() => {
    // Mock WebSocket
    originalWebSocket = window.WebSocket;
    webSocketStub = stub(window, 'WebSocket').callsFake((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      mockWebSocket.autoOpen = false; // Disable auto-open by default
      return mockWebSocket as any;
    });
    
    // Mock document.cookie
    cookieStub = stub(document, 'cookie').value('');
    
    clock = useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    webSocketStub.restore();
    cookieStub.restore();
    window.WebSocket = originalWebSocket;
  });

  describe('Component Initialization', () => {
    it('creates component with default properties', async () => {
      const webChat = await getWebChat();
      
      assert.instanceOf(webChat, WebChat);
      expect(webChat.open).to.equal(false);
      expect(webChat.status).to.equal('disconnected');
      expect(webChat.hasPendingText).to.equal(false);
      expect(webChat.messageGroups).to.deep.equal([]);
      expect(webChat.blockHistoryFetching).to.equal(false);
    });

    it('accepts channel and urn properties', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        urn: 'test-urn-123'
      });
      
      expect(webChat.channel).to.equal('test-channel');
      expect(webChat.urn).to.equal('test-urn-123');
    });
    
    it('accepts host and activeUserAvatar properties', async () => {
      const webChat = await getWebChat({
        host: 'example.com',
        activeUserAvatar: 'https://example.com/avatar.jpg'
      });
      
      expect(webChat.host).to.equal('example.com');
      expect(webChat.activeUserAvatar).to.equal('https://example.com/avatar.jpg');
    });

    it('initializes chat component on first update', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      // Check that the chat component was initialized
      const chatElement = webChat.shadowRoot.querySelector('temba-chat');
      expect(chatElement).to.exist;
    });
  });

  describe('UI Rendering', () => {
    it('renders closed chat widget by default', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      await assertScreenshot('webchat/closed-widget', getClip(webChat));
    });

    it('renders opened chat widget', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        open: true
      });
      
      await assertScreenshot('webchat/opened-widget', getClip(webChat));
    });
    
    it('renders connecting state', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        open: true,
        status: 'connecting'
      });
      
      await assertScreenshot('webchat/connecting-state', getClip(webChat));
    });
    
    it('renders disconnected state with reconnect option', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        open: true,
        status: 'disconnected'
      });
      
      await assertScreenshot('webchat/disconnected-state', getClip(webChat));
    });

    it('renders connected state with input field', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        open: true,
        status: 'connected'
      });
      
      await assertScreenshot('webchat/connected-state', getClip(webChat));
    });
  });

  describe('Chat Toggle Functionality', () => {
    it('toggles chat open/closed', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      expect(webChat.open).to.equal(false);
      
      // Click the toggle container (div wrapping the .toggle div)
      const toggleContainer = webChat.shadowRoot.querySelector('.toggle').parentElement;
      expect(toggleContainer).to.exist;
      
      toggleContainer.dispatchEvent(new MouseEvent('click'));
      await webChat.updateComplete;
      
      expect(webChat.open).to.equal(true);
      
      // Click toggle again
      toggleContainer.dispatchEvent(new MouseEvent('click'));
      await webChat.updateComplete;
      
      expect(webChat.open).to.equal(false);
    });
    
    it('toggles chat via close button', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        open: true
      });
      
      expect(webChat.open).to.equal(true);
      
      // Click close button in header
      const closeButton = webChat.shadowRoot.querySelector('.close-button');
      expect(closeButton).to.exist;
      
      closeButton.dispatchEvent(new MouseEvent('click'));
      await webChat.updateComplete;
      
      expect(webChat.open).to.equal(false);
    });
    
    it('opens chat programmatically', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      expect(webChat.open).to.equal(false);
      
      webChat.openChat();
      await webChat.updateComplete;
      
      expect(webChat.open).to.equal(true);
    });
  });

  describe('Socket Connection Management', () => {
    it('opens socket when chat is opened', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      expect(webChat.status).to.equal('disconnected');
      
      // Open chat - this should trigger socket connection
      webChat.open = true;
      await webChat.updateComplete;
      
      expect(webChat.status).to.equal('connecting');
      expect(webSocketStub.called).to.be.true;
      expect(mockWebSocket.url).to.include('test-channel');
      
      // Now simulate the socket opening
      mockWebSocket.manualOpen();
      await webChat.updateComplete;
      
      expect(webChat.status).to.equal('connected');
    });

    it('does not open socket if already connecting or connected', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      // First connection
      webChat.open = true;
      await webChat.updateComplete;
      await clock.tick(0);
      
      const firstCallCount = webSocketStub.callCount;
      
      // Try to connect again while connecting
      webChat.open = false;
      webChat.open = true;
      await webChat.updateComplete;
      await clock.tick(0);
      
      // Should not create another socket
      expect(webSocketStub.callCount).to.equal(firstCallCount);
    });

    it('constructs correct WebSocket URL with channel', async () => {
      const webChat = await getWebChat({
        channel: 'my-channel'
      });
      
      webChat.open = true;
      await webChat.updateComplete;
      await clock.tick(0);
      
      expect(mockWebSocket.url).to.equal('wss://localhost.textit.com/wc/connect/my-channel/');
    });

    it('includes urn in WebSocket URL when present', async () => {
      const webChat = await getWebChat({
        channel: 'my-channel',
        urn: 'chat-123'
      });
      
      webChat.open = true;
      await webChat.updateComplete;
      await clock.tick(0);
      
      expect(mockWebSocket.url).to.equal('wss://localhost.textit.com/wc/connect/my-channel/?chat_id=chat-123');
    });

    it('sends start_chat command on socket open', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      webChat.open = true;
      await webChat.updateComplete;
      await clock.tick(0);
      
      expect(mockWebSocket.sentMessages).to.have.length(1);
      const sentMessage = JSON.parse(mockWebSocket.sentMessages[0]);
      expect(sentMessage.type).to.equal('start_chat');
    });

    it('includes chat_id in start_chat command when urn is present', async () => {
      // Set the cookie directly in document.cookie
      cookieStub.value('temba-chat-urn=existing-chat-123');
      
      const webChat = await getWebChat({
        channel: 'test-channel',
        urn: 'existing-chat-123'
      });
      
      webChat.open = true;
      await webChat.updateComplete;
      
      mockWebSocket.manualOpen();
      await webChat.updateComplete;
      
      const sentMessage = JSON.parse(mockWebSocket.sentMessages[0]);
      expect(sentMessage.type).to.equal('start_chat');
      // The chat_id should be 'existing-chat-123' either from the urn property or cookie
      expect(sentMessage.chat_id).to.equal('existing-chat-123');
    });

    it('handles socket close event', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      webChat.open = true;
      await webChat.updateComplete;
      
      expect(webChat.status).to.equal('connecting');
      
      mockWebSocket.close();
      await webChat.updateComplete;
      
      expect(webChat.status).to.equal('disconnected');
    });

    it('handles socket error event', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel'
      });
      
      webChat.open = true;
      await webChat.updateComplete;
      
      expect(webChat.status).to.equal('connecting');
      
      mockWebSocket.simulateError();
      await webChat.updateComplete;
      
      expect(webChat.status).to.equal('disconnected');
    });

    it('reconnects when reconnect button is clicked', async () => {
      const webChat = await getWebChat({
        channel: 'test-channel',
        open: true,
        status: 'disconnected'
      });
      
      const reconnectButton = webChat.shadowRoot.querySelector('.reconnect');
      expect(reconnectButton).to.exist;
      
      reconnectButton.dispatchEvent(new MouseEvent('click'));
      await webChat.updateComplete;
      
      expect(webSocketStub.called).to.be.true;
      expect(webChat.status).to.equal('connecting');
    });
  });
});