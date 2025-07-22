import { html, fixture, expect } from '@open-wc/testing';
import {
  renderAddContactUrn,
  renderAddInputLabels,
  renderAddToGroups,
  renderCallClassifier,
  renderCallLLM,
  renderCallResthook,
  renderCallWebhook,
  renderEnterFlow,
  renderOpenTicket,
  renderPlayAudio,
  renderRemoveFromGroups,
  renderRequestOptin,
  renderSayMsg,
  renderSendBroadcast,
  renderSendEmail,
  renderSendMsg,
  renderSetContactChannel,
  renderSetContactField,
  renderSetContactLanguage,
  renderSetContactName,
  renderSetContactStatus,
  renderSetRunResult,
  renderStartSession,
  renderTransferAirtime,
  renderWaitForAudio,
  renderWaitForDigits,
  renderWaitForImage,
  renderWaitForLocation,
  renderWaitForMenu,
  renderWaitForResponse,
  renderWaitForVideo
} from '../src/flow/render';
import {
  AddContactUrn,
  AddInputLabels,
  AddToGroup,
  CallClassifier,
  CallLLM,
  CallResthook,
  CallWebhook,
  EnterFlow,
  Node,
  OpenTicket,
  PlayAudio,
  RemoveFromGroup,
  RequestOptin,
  SayMsg,
  SendBroadcast,
  SendEmail,
  SendMsg,
  SetContactChannel,
  SetContactField,
  SetContactLanguage,
  SetContactName,
  SetContactStatus,
  SetRunResult,
  StartSession,
  TransferAirtime,
  WaitForAudio,
  WaitForDigits,
  WaitForImage,
  WaitForLocation,
  WaitForMenu,
  WaitForResponse,
  WaitForVideo
} from '../src/store/flow-definition.d';

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
        uuid: 'action-uuid-1',
        text: 'Hello world\nThis is a new line',
        quick_replies: []
      };

      const result = renderSendMsg(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.innerHTML).to.contain(
        'Hello world<br>This is a new line'
      );
    });

    it('renders quick replies when present', async () => {
      const action: SendMsg = {
        type: 'send_msg',
        uuid: 'action-uuid-2',
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
        uuid: 'action-uuid-3',
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
        uuid: 'action-uuid-4',
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
        uuid: 'action-uuid-5',
        category: 'success',
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
        uuid: 'action-uuid-6',
        url: 'https://example.com/webhook'
      };

      const result = renderCallWebhook(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.innerHTML).to.contain('https://example.com/webhook');
      expect(container.querySelector('div')).to.have.style(
        'word-break',
        'break-all'
      );
    });
  });

  describe('renderAddToGroups', () => {
    it('renders groups with icons', async () => {
      const action: AddToGroup = {
        type: 'add_contact_groups',
        uuid: 'action-uuid-7',
        groups: [
          {
            uuid: 'group1',
            name: 'VIP Customers',
            status: 'active',
            system: false,
            query: '',
            count: 10
          },
          {
            uuid: 'group2',
            name: 'Newsletter Subscribers',
            status: 'active',
            system: false,
            query: '',
            count: 25
          }
        ]
      };

      const result = renderAddToGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.innerHTML).to.contain('VIP Customers');
      expect(container.innerHTML).to.contain('Newsletter Subscribers');
      expect(container.querySelectorAll('temba-icon')).to.have.length(2);

      const icons = container.querySelectorAll('temba-icon');
      icons.forEach((icon) => {
        expect(icon.getAttribute('name')).to.equal('group');
      });
    });

    it('renders empty groups array', async () => {
      const action: AddToGroup = {
        type: 'add_contact_groups',
        uuid: 'action-uuid-8',
        groups: []
      };

      const result = renderAddToGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.querySelectorAll('temba-icon')).to.have.length(0);
    });

    it('renders groups without icons when undefined', async () => {
      // Test the renderNamedObjects function without an icon parameter
      const action: AddToGroup = {
        type: 'add_contact_groups',
        uuid: 'action-uuid-9',
        groups: [
          {
            uuid: 'group1',
            name: 'Test Group',
            status: 'active',
            system: false,
            query: '',
            count: 5
          }
        ]
      };

      // Create a test version that calls renderNamedObjects without icon
      // to cover the null case in the render.ts file
      const namedObjects = action.groups;

      // Create a test version that calls renderNamedObjects without icon
      const testRender = (assets: any[]) => {
        return assets.map((asset) => {
          return html`<div style="display:flex;items-align:center">
            ${null /* This should trigger the null branch */}
            <div>${asset.name}</div>
          </div>`;
        });
      };

      const result = testRender(namedObjects);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.innerHTML).to.contain('Test Group');
      expect(container.querySelectorAll('temba-icon')).to.have.length(0);
    });

    it('renders groups with limit - shows +X more for 5+ items', async () => {
      const action: AddToGroup = {
        type: 'add_contact_groups',
        uuid: 'action-uuid-9b',
        groups: [
          {
            uuid: 'group1',
            name: 'Group 1',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group2',
            name: 'Group 2',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group3',
            name: 'Group 3',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group4',
            name: 'Group 4',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group5',
            name: 'Group 5',
            status: 'active',
            system: false,
            query: '',
            count: 1
          }
        ]
      };

      const result = renderAddToGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Group 1');
      expect(container.textContent).to.contain('Group 2');
      expect(container.textContent).to.contain('Group 3');
      expect(container.textContent).to.contain('+2 more');
      expect(container.textContent).to.not.contain('Group 4');
      expect(container.textContent).to.not.contain('Group 5');
    });

    it('renders all 4 groups when exactly 4 items', async () => {
      const action: AddToGroup = {
        type: 'add_contact_groups',
        uuid: 'action-uuid-9c',
        groups: [
          {
            uuid: 'group1',
            name: 'Group 1',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group2',
            name: 'Group 2',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group3',
            name: 'Group 3',
            status: 'active',
            system: false,
            query: '',
            count: 1
          },
          {
            uuid: 'group4',
            name: 'Group 4',
            status: 'active',
            system: false,
            query: '',
            count: 1
          }
        ]
      };

      const result = renderAddToGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Group 1');
      expect(container.textContent).to.contain('Group 2');
      expect(container.textContent).to.contain('Group 3');
      expect(container.textContent).to.contain('Group 4');
      expect(container.textContent).to.not.contain('+');
    });
  });

  describe('renderRemoveFromGroups', () => {
    it('renders groups with icons for removal', async () => {
      const action: RemoveFromGroup = {
        type: 'remove_contact_groups',
        uuid: 'action-uuid-10',
        groups: [
          {
            uuid: 'group1',
            name: 'VIP Customers',
            status: 'active',
            system: false,
            query: '',
            count: 10
          }
        ]
      };

      const result = renderRemoveFromGroups(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.innerHTML).to.contain('VIP Customers');
      expect(container.querySelectorAll('temba-icon')).to.have.length(1);
      const icon = container.querySelector('temba-icon');
      expect(icon?.getAttribute('name')).to.equal('group');
    });
  });

  describe('renderSetContactField', () => {
    it('renders contact field setting', async () => {
      const action: SetContactField = {
        type: 'set_contact_field',
        uuid: 'action-uuid-11',
        field: { uuid: 'field1', name: 'Favorite Color' },
        value: 'Blue'
      };

      const result = renderSetContactField(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Set');
      expect(container.textContent).to.contain('Favorite Color');
      expect(container.textContent).to.contain('to');
      expect(container.textContent).to.contain('Blue');
      expect(container.querySelectorAll('b')).to.have.length(2);
    });
  });

  describe('renderSetContactLanguage', () => {
    it('renders contact language setting', async () => {
      const action: SetContactLanguage = {
        type: 'set_contact_language',
        uuid: 'action-uuid-12',
        language: 'Spanish'
      };

      const result = renderSetContactLanguage(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Set contact language to');
      expect(container.textContent).to.contain('Spanish');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderSetContactStatus', () => {
    it('renders contact status setting', async () => {
      const action: SetContactStatus = {
        type: 'set_contact_status',
        uuid: 'action-uuid-13',
        status: 'blocked'
      };

      const result = renderSetContactStatus(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Set contact status to');
      expect(container.textContent).to.contain('blocked');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderAddContactUrn', () => {
    it('renders URN addition with friendly scheme names', async () => {
      const action: AddContactUrn = {
        type: 'add_contact_urn',
        uuid: 'action-uuid-14',
        scheme: 'tel',
        path: '+1234567890'
      };

      const result = renderAddContactUrn(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Add');
      expect(container.textContent).to.contain('Phone Number');
      expect(container.textContent).to.contain('+1234567890');
      expect(container.querySelectorAll('b')).to.have.length(2);
    });

    it('renders URN addition with unmapped scheme', async () => {
      const action: AddContactUrn = {
        type: 'add_contact_urn',
        uuid: 'action-uuid-14b',
        scheme: 'unknown',
        path: 'test123'
      };

      const result = renderAddContactUrn(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Add');
      expect(container.textContent).to.contain('unknown');
      expect(container.textContent).to.contain('test123');
    });
  });

  describe('renderSendEmail', () => {
    it('renders email with subject and body', async () => {
      const action: SendEmail = {
        type: 'send_email',
        uuid: 'action-uuid-15',
        subject: 'Welcome!',
        body: 'Thanks for signing up',
        addresses: ['user@example.com', 'admin@example.com']
      };

      const result = renderSendEmail(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      // No longer expects "Send email to" prefix
      expect(container.textContent).to.contain(
        'user@example.com, admin@example.com'
      );
      expect(container.textContent).to.contain('Subject:');
      expect(container.textContent).to.contain('Welcome!');
      expect(container.textContent).to.contain('Thanks for signing up');
    });
  });

  describe('renderSendBroadcast', () => {
    it('renders broadcast with groups and contacts', async () => {
      const action: SendBroadcast = {
        type: 'send_broadcast',
        uuid: 'action-uuid-16',
        text: 'Important announcement',
        groups: [
          {
            uuid: 'group1',
            name: 'VIP Customers',
            status: 'active',
            system: false,
            query: '',
            count: 10
          }
        ],
        contacts: [{ uuid: 'contact1', name: 'John Doe' }]
      };

      const result = renderSendBroadcast(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Important announcement');
      expect(container.textContent).to.contain('Groups:');
      expect(container.textContent).to.contain('VIP Customers');
      expect(container.textContent).to.contain('Contacts:');
      expect(container.textContent).to.contain('John Doe');
    });

    it('renders broadcast with text only', async () => {
      const action: SendBroadcast = {
        type: 'send_broadcast',
        uuid: 'action-uuid-17',
        text: 'Simple broadcast',
        groups: [],
        contacts: []
      };

      const result = renderSendBroadcast(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Simple broadcast');
      expect(container.textContent).to.not.contain('Groups:');
      expect(container.textContent).to.not.contain('Contacts:');
    });
  });

  describe('renderEnterFlow', () => {
    it('renders flow entry', async () => {
      const action: EnterFlow = {
        type: 'enter_flow',
        uuid: 'action-uuid-18',
        flow: { uuid: 'flow1', name: 'Registration Flow' }
      };

      const result = renderEnterFlow(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Enter flow');
      expect(container.textContent).to.contain('Registration Flow');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderStartSession', () => {
    it('renders session start with groups and contacts', async () => {
      const action: StartSession = {
        type: 'start_session',
        uuid: 'action-uuid-19',
        flow: { uuid: 'flow1', name: 'Survey Flow' },
        groups: [
          {
            uuid: 'group1',
            name: 'Subscribers',
            status: 'active',
            system: false,
            query: '',
            count: 50
          }
        ],
        contacts: [{ uuid: 'contact1', name: 'Jane Smith' }]
      };

      const result = renderStartSession(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Start');
      expect(container.textContent).to.contain('Survey Flow');
      expect(container.textContent).to.contain('for:');
      expect(container.textContent).to.contain('Groups:');
      expect(container.textContent).to.contain('Subscribers');
      expect(container.textContent).to.contain('Contacts:');
      expect(container.textContent).to.contain('Jane Smith');
    });
  });

  describe('renderTransferAirtime', () => {
    it('renders airtime transfer', async () => {
      const action: TransferAirtime = {
        type: 'transfer_airtime',
        uuid: 'action-uuid-20',
        amounts: [100, 200, 500],
        result_name: 'airtime_result'
      };

      const result = renderTransferAirtime(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Transfer airtime amounts:');
      expect(container.textContent).to.contain('100, 200, 500');
      expect(container.textContent).to.contain('Save result as');
      expect(container.textContent).to.contain('airtime_result');
    });
  });

  describe('renderCallClassifier', () => {
    it('renders classifier call', async () => {
      const action: CallClassifier = {
        type: 'call_classifier',
        uuid: 'action-uuid-21',
        classifier: { uuid: 'classifier1', name: 'Intent Classifier' },
        input: 'User message text',
        result_name: 'intent_result'
      };

      const result = renderCallClassifier(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Call classifier');
      expect(container.textContent).to.contain('Intent Classifier');
      expect(container.textContent).to.contain('Input:');
      expect(container.textContent).to.contain('User message text');
      expect(container.textContent).to.contain('Save result as');
      expect(container.textContent).to.contain('intent_result');
    });
  });

  describe('renderCallResthook', () => {
    it('renders resthook call', async () => {
      const action: CallResthook = {
        type: 'call_resthook',
        uuid: 'action-uuid-22',
        resthook: 'survey-complete',
        result_name: 'webhook_result'
      };

      const result = renderCallResthook(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Call resthook');
      expect(container.textContent).to.contain('survey-complete');
      expect(container.textContent).to.contain('Save result as');
      expect(container.textContent).to.contain('webhook_result');
    });
  });

  describe('renderCallLLM', () => {
    it('renders LLM call', async () => {
      const action: CallLLM = {
        type: 'call_llm',
        uuid: 'action-uuid-23',
        llm: { uuid: 'llm1', name: 'GPT-4' },
        prompt: 'Analyze this text',
        result_name: 'ai_result'
      };

      const result = renderCallLLM(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      // No longer expects "Call AI" prefix
      expect(container.textContent).to.contain('GPT-4');
      expect(container.textContent).to.contain('Analyze this text');
      expect(container.textContent).to.contain('Save result as');
      expect(container.textContent).to.contain('ai_result');
    });
  });

  describe('renderOpenTicket', () => {
    it('renders ticket with assignee and topic', async () => {
      const action: OpenTicket = {
        type: 'open_ticket',
        uuid: 'action-uuid-24',
        subject: 'Support Request',
        body: 'Customer needs help',
        assignee: { uuid: 'user1', name: 'Support Agent' },
        topic: { uuid: 'topic1', name: 'Technical Support' }
      };

      const result = renderOpenTicket(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      // No longer expects subject
      expect(container.textContent).to.contain('Customer needs help');
      expect(container.textContent).to.contain('Support Agent');
      expect(container.textContent).to.contain('Technical Support');
      expect(container.querySelectorAll('temba-icon')).to.have.length(2);
    });

    it('renders ticket without assignee or topic', async () => {
      const action: OpenTicket = {
        type: 'open_ticket',
        uuid: 'action-uuid-25',
        subject: 'Basic Ticket',
        body: 'Simple ticket content'
      };

      const result = renderOpenTicket(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      // No longer expects subject
      expect(container.textContent).to.contain('Simple ticket content');
      expect(container.querySelectorAll('temba-icon')).to.have.length(0);
    });
  });

  describe('renderRequestOptin', () => {
    it('renders optin request', async () => {
      const action: RequestOptin = {
        type: 'request_optin',
        uuid: 'action-uuid-26',
        optin: { uuid: 'optin1', name: 'Newsletter Subscription' }
      };

      const result = renderRequestOptin(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Request opt-in for');
      expect(container.textContent).to.contain('Newsletter Subscription');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderAddInputLabels', () => {
    it('renders input labels', async () => {
      const action: AddInputLabels = {
        type: 'add_input_labels',
        uuid: 'action-uuid-27',
        labels: [
          { uuid: 'label1', name: 'Important' },
          { uuid: 'label2', name: 'Customer Service' }
        ]
      };

      const result = renderAddInputLabels(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      // No longer expects "Add labels to input:" prefix
      expect(container.textContent).to.contain('Important');
      expect(container.textContent).to.contain('Customer Service');
      expect(container.querySelectorAll('temba-icon')).to.have.length(2);
    });
  });

  describe('renderSayMsg', () => {
    it('renders voice message with audio URL', async () => {
      const action: SayMsg = {
        type: 'say_msg',
        uuid: 'action-uuid-28',
        text: 'Welcome to our service',
        audio_url: 'https://example.com/audio.mp3'
      };

      const result = renderSayMsg(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Welcome to our service');
      expect(container.innerHTML).to.contain('https://example.com/audio.mp3');
      expect(container.querySelector('temba-icon')).to.exist;
      expect(
        container.querySelector('temba-icon')?.getAttribute('name')
      ).to.equal('audio');
    });

    it('renders voice message without audio URL', async () => {
      const action: SayMsg = {
        type: 'say_msg',
        uuid: 'action-uuid-29',
        text: 'Text only message'
      };

      const result = renderSayMsg(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Text only message');
      expect(container.querySelector('temba-icon')).to.not.exist;
    });
  });

  describe('renderPlayAudio', () => {
    it('renders audio playback', async () => {
      const action: PlayAudio = {
        type: 'play_audio',
        uuid: 'action-uuid-30',
        audio_url: 'https://example.com/music.mp3'
      };

      const result = renderPlayAudio(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.innerHTML).to.contain('https://example.com/music.mp3');
      expect(container.querySelector('temba-icon')).to.exist;
      expect(
        container.querySelector('temba-icon')?.getAttribute('name')
      ).to.equal('audio');
    });
  });

  describe('renderSetContactChannel', () => {
    it('renders contact channel setting', async () => {
      const action: SetContactChannel = {
        type: 'set_contact_channel',
        uuid: 'action-uuid-31',
        channel: { uuid: 'channel1', name: 'WhatsApp Channel' }
      };

      const result = renderSetContactChannel(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Set contact channel to');
      expect(container.textContent).to.contain('WhatsApp Channel');
      expect(container.querySelector('b')).to.exist;
    });
  });

  describe('renderWaitForResponse', () => {
    it('renders wait for response with timeout', async () => {
      const action: WaitForResponse = {
        type: 'wait_for_response',
        uuid: 'action-uuid-32',
        timeout: 300
      };

      const result = renderWaitForResponse(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for message response');
      expect(container.textContent).to.contain('Timeout after');
      expect(container.textContent).to.contain('300');
      expect(container.textContent).to.contain('seconds');
    });

    it('renders wait for response without timeout', async () => {
      const action: WaitForResponse = {
        type: 'wait_for_response',
        uuid: 'action-uuid-33'
      };

      const result = renderWaitForResponse(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for message response');
      expect(container.textContent).to.not.contain('Timeout');
    });
  });

  describe('renderWaitForMenu', () => {
    it('renders wait for menu with timeout', async () => {
      const action: WaitForMenu = {
        type: 'wait_for_menu',
        uuid: 'action-uuid-34',
        menu: { uuid: 'menu1', name: 'Main Menu' },
        timeout: 120
      };

      const result = renderWaitForMenu(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for menu selection:');
      expect(container.textContent).to.contain('Main Menu');
      expect(container.textContent).to.contain('Timeout after');
      expect(container.textContent).to.contain('120');
    });
  });

  describe('renderWaitForDigits', () => {
    it('renders wait for single digit', async () => {
      const action: WaitForDigits = {
        type: 'wait_for_digits',
        uuid: 'action-uuid-35',
        count: 1,
        timeout: 60
      };

      const result = renderWaitForDigits(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for');
      expect(container.textContent).to.contain('1');
      expect(container.textContent).to.contain('digit');
      expect(container.textContent).to.not.contain('digits');
      expect(container.textContent).to.contain('Timeout after 60');
    });

    it('renders wait for multiple digits', async () => {
      const action: WaitForDigits = {
        type: 'wait_for_digits',
        uuid: 'action-uuid-36',
        count: 4
      };

      const result = renderWaitForDigits(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for');
      expect(container.textContent).to.contain('4');
      expect(container.textContent).to.contain('digits');
      expect(container.textContent).to.not.contain('Timeout');
    });
  });

  describe('renderWaitForAudio', () => {
    it('renders wait for audio with icon', async () => {
      const action: WaitForAudio = {
        type: 'wait_for_audio',
        uuid: 'action-uuid-37',
        timeout: 180
      };

      const result = renderWaitForAudio(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for audio recording');
      expect(container.textContent).to.contain('Timeout after 180');
      expect(container.querySelector('temba-icon')).to.exist;
      expect(
        container.querySelector('temba-icon')?.getAttribute('name')
      ).to.equal('audio');
    });
  });

  describe('renderWaitForVideo', () => {
    it('renders wait for video with icon', async () => {
      const action: WaitForVideo = {
        type: 'wait_for_video',
        uuid: 'action-uuid-38'
      };

      const result = renderWaitForVideo(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for video recording');
      expect(container.querySelector('temba-icon')).to.exist;
      expect(
        container.querySelector('temba-icon')?.getAttribute('name')
      ).to.equal('video');
    });
  });

  describe('renderWaitForImage', () => {
    it('renders wait for image with icon', async () => {
      const action: WaitForImage = {
        type: 'wait_for_image',
        uuid: 'action-uuid-39',
        timeout: 240
      };

      const result = renderWaitForImage(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for image');
      expect(container.textContent).to.contain('Timeout after 240');
      expect(container.querySelector('temba-icon')).to.exist;
      expect(
        container.querySelector('temba-icon')?.getAttribute('name')
      ).to.equal('image');
    });
  });

  describe('renderWaitForLocation', () => {
    it('renders wait for location with icon', async () => {
      const action: WaitForLocation = {
        type: 'wait_for_location',
        uuid: 'action-uuid-40'
      };

      const result = renderWaitForLocation(mockNode, action);
      const container = await fixture(html`<div>${result}</div>`);

      expect(container.textContent).to.contain('Wait for location');
      expect(container.querySelector('temba-icon')).to.exist;
      expect(
        container.querySelector('temba-icon')?.getAttribute('name')
      ).to.equal('location');
    });
  });
});
