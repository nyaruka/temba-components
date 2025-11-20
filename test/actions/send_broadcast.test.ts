import { expect } from '@open-wc/testing';
import { send_broadcast } from '../../src/flow/actions/send_broadcast';
import { SendBroadcast } from '../../src/store/flow-definition';
import { ActionTest } from '../ActionHelper';

/**
 * Test suite for the send_broadcast action configuration.
 */
describe('send_broadcast action config', () => {
  const helper = new ActionTest(send_broadcast, 'send_broadcast');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(send_broadcast.name).to.equal('Send Broadcast');
    });
  });

  describe('action scenarios', () => {
    helper.testAction(
      {
        uuid: 'test-action-1',
        type: 'send_broadcast',
        text: 'Important announcement for all subscribers!',
        groups: [
          { uuid: 'group-1', name: 'Subscribers' },
          { uuid: 'group-2', name: 'VIP Members' }
        ],
        contacts: []
      } as SendBroadcast,
      'groups-only'
    );

    helper.testAction(
      {
        uuid: 'test-action-2',
        type: 'send_broadcast',
        text: 'Personal message to specific contacts.',
        groups: [],
        contacts: [
          { uuid: 'contact-1', name: 'Alice Johnson' },
          { uuid: 'contact-2', name: 'Bob Smith' }
        ]
      } as SendBroadcast,
      'contacts-only'
    );

    helper.testAction(
      {
        uuid: 'test-action-3',
        type: 'send_broadcast',
        text: 'Urgent update for everyone!',
        groups: [{ uuid: 'group-1', name: 'All Members' }],
        contacts: [{ uuid: 'contact-1', name: 'Admin' }]
      } as SendBroadcast,
      'groups-and-contacts'
    );

    helper.testAction(
      {
        uuid: 'test-action-4',
        type: 'send_broadcast',
        text: 'Multi-line broadcast message.\n\nThis is the second paragraph.\n\nAnd the third.',
        groups: [{ uuid: 'group-1', name: 'Newsletter Subscribers' }],
        contacts: []
      } as SendBroadcast,
      'multiline-text'
    );

    helper.testAction(
      {
        uuid: 'test-action-5',
        type: 'send_broadcast',
        text: 'Broadcast with attachments',
        groups: [{ uuid: 'group-1', name: 'Members' }],
        contacts: [],
        attachments: [
          'image/jpeg:https://example.com/photo.jpg',
          'application/pdf:https://example.com/document.pdf'
        ]
      } as SendBroadcast,
      'with-attachments',
      true
    );

    helper.testAction(
      {
        uuid: 'test-action-6',
        type: 'send_broadcast',
        text: 'Message to many groups',
        groups: [
          { uuid: 'group-1', name: 'Group A' },
          { uuid: 'group-2', name: 'Group B' },
          { uuid: 'group-3', name: 'Group C' },
          { uuid: 'group-4', name: 'Group D' }
        ],
        contacts: []
      } as SendBroadcast,
      'many-groups'
    );
  });

  describe('form data conversion', () => {
    it('converts action to form data correctly', () => {
      const action: SendBroadcast = {
        uuid: 'test-uuid',
        type: 'send_broadcast',
        text: 'Test message',
        groups: [{ uuid: 'group-1', name: 'Test Group' }],
        contacts: [{ uuid: 'contact-1', name: 'Test Contact' }],
        attachments: ['image/jpeg:test.jpg']
      };

      const formData = send_broadcast.toFormData(action);

      expect(formData.uuid).to.equal('test-uuid');
      expect(formData.text).to.equal('Test message');
      expect(formData.recipients).to.have.lengthOf(2);
      expect(formData.attachments).to.deep.equal(['image/jpeg:test.jpg']);
    });

    it('converts form data to action correctly with contacts only', () => {
      const formData = {
        uuid: 'test-uuid',
        recipients: [
          { uuid: 'contact-1', name: 'Contact 1' },
          { uuid: 'contact-2', name: 'Contact 2' }
        ],
        text: 'Test message',
        attachments: []
      };

      const action = send_broadcast.fromFormData(formData) as SendBroadcast;

      expect(action.uuid).to.equal('test-uuid');
      expect(action.type).to.equal('send_broadcast');
      expect(action.text).to.equal('Test message');
      expect(action.contacts).to.have.lengthOf(2);
      expect(action.groups).to.have.lengthOf(0);
      expect(action.attachments).to.be.undefined;
    });

    it('converts form data to action correctly with groups only', () => {
      const formData = {
        uuid: 'test-uuid',
        recipients: [
          { uuid: 'group-1', name: 'Group 1', group: true },
          { uuid: 'group-2', name: 'Group 2', group: true }
        ],
        text: 'Test message',
        attachments: []
      };

      const action = send_broadcast.fromFormData(formData) as SendBroadcast;

      expect(action.contacts).to.have.lengthOf(0);
      expect(action.groups).to.have.lengthOf(2);
    });

    it('converts form data to action correctly with mixed recipients', () => {
      const formData = {
        uuid: 'test-uuid',
        recipients: [
          { uuid: 'contact-1', name: 'Contact 1' },
          { uuid: 'group-1', name: 'Group 1', group: true }
        ],
        text: 'Test message',
        attachments: ['image/jpeg:test.jpg']
      };

      const action = send_broadcast.fromFormData(formData) as SendBroadcast;

      expect(action.contacts).to.have.lengthOf(1);
      expect(action.groups).to.have.lengthOf(1);
      expect(action.attachments).to.deep.equal(['image/jpeg:test.jpg']);
    });

    it('sanitizes text by trimming whitespace', () => {
      const formData = {
        uuid: 'test-uuid',
        recipients: [{ uuid: 'contact-1', name: 'Test Contact' }],
        text: '  Test message  \n  '
      };

      send_broadcast.sanitize(formData);

      expect(formData.text).to.equal('Test message');
    });
  });
});
