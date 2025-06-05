import { html, fixture, expect, assert } from '@open-wc/testing';
import { 
  renderSendMsg, 
  renderSetContactName, 
  renderSetRunResult, 
  renderCallWebhook, 
  renderAddToGroups 
} from '../src/flow/render';
import { 
  Node, 
  SendMsg, 
  SetContactName, 
  SetRunResult, 
  CallWebhook, 
  AddToGroup 
} from '../src/store/flow-definition';

describe('Flow Render Functions', () => {
  const mockNode: Node = {
    uuid: 'test-node-uuid',
    actions: [],
    exits: []
  };

  describe('renderSendMsg', () => {
    it('renders message text with line breaks', async () => {
      const action: SendMsg = {
        type: 'send_msg',
        text: 'Hello world\nThis is a new line',
        quick_replies: []
      };

      const result = renderSendMsg(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.innerHTML).to.contain('Hello world<br>This is a new line');
    });

    it('renders quick replies when present', async () => {
      const action: SendMsg = {
        type: 'send_msg',
        text: 'Choose an option:',
        quick_replies: ['Yes', 'No', 'Maybe']
      };

      const result = renderSendMsg(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.innerHTML).to.contain('Choose an option:');
      expect(container.innerHTML).to.contain('quick-replies');
      expect(container.innerHTML).to.contain('Yes');
      expect(container.innerHTML).to.contain('No');
      expect(container.innerHTML).to.contain('Maybe');
    });

    it('renders without quick replies when none provided', async () => {
      const action: SendMsg = {
        type: 'send_msg',
        text: 'Simple message',
        quick_replies: []
      };

      const result = renderSendMsg(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.innerHTML).to.contain('Simple message');
      expect(container.innerHTML).to.not.contain('quick-replies');
    });
  });

  describe('renderSetContactName', () => {
    it('renders contact name setting', async () => {
      const action: SetContactName = {
        type: 'set_contact_name',
        name: 'John Doe'
      };

      const result = renderSetContactName(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.textContent).to.contain('Set contact name to');
      expect(container.textContent).to.contain('John Doe');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderSetRunResult', () => {
    it('renders run result setting', async () => {
      const action: SetRunResult = {
        type: 'set_run_result',
        name: 'favorite_color',
        value: 'blue'
      };

      const result = renderSetRunResult(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.textContent).to.contain('Save blue as');
      expect(container.textContent).to.contain('favorite_color');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderCallWebhook', () => {
    it('renders webhook URL', async () => {
      const action: CallWebhook = {
        type: 'call_webhook',
        url: 'https://example.com/webhook'
      };

      const result = renderCallWebhook(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.innerHTML).to.contain('https://example.com/webhook');
      expect(container.querySelector('div')).to.have.style('word-break', 'break-all');
    });
  });

  describe('renderAddToGroups', () => {
    it('renders groups with icons', async () => {
      const action: AddToGroup = {
        type: 'add_contact_groups',
        groups: [
          { uuid: 'group1', name: 'VIP Customers' },
          { uuid: 'group2', name: 'Newsletter Subscribers' }
        ]
      };

      const result = renderAddToGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.innerHTML).to.contain('VIP Customers');
      expect(container.innerHTML).to.contain('Newsletter Subscribers');
      expect(container.querySelectorAll('temba-icon')).to.have.length(2);
      
      const icons = container.querySelectorAll('temba-icon');
      icons.forEach(icon => {
        expect(icon.getAttribute('name')).to.equal('group');
      });
    });

    it('renders empty groups array', async () => {
      const action: AddToGroup = {
        type: 'add_contact_groups',
        groups: []
      };

      const result = renderAddToGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);
      
      expect(container.querySelectorAll('temba-icon')).to.have.length(0);
    });
  });
});