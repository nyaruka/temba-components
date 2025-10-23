import { expect } from '@open-wc/testing';
import { start_session } from '../../src/flow/actions/start_session';
import { StartSession } from '../../src/store/flow-definition';
import { ActionTest } from '../ActionHelper';

/**
 * Test suite for the start_session action configuration.
 */
describe('start_session action config', () => {
  const helper = new ActionTest(start_session, 'start_session');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(start_session.name).to.equal('Start Session');
    });
  });

  describe('action scenarios', () => {
    helper.testAction(
      {
        uuid: 'test-action-1',
        type: 'start_session',
        flow: { uuid: 'flow-1', name: 'Registration Flow' },
        groups: [
          { uuid: 'group-1', name: 'Subscribers' },
          { uuid: 'group-2', name: 'Volunteers' }
        ],
        contacts: [
          { uuid: 'contact-1', name: 'Norbert Kwizera' },
          { uuid: 'contact-2', name: 'Rowan Seymour' }
        ]
      } as StartSession,
      'groups-and-contacts'
    );

    helper.testAction(
      {
        uuid: 'test-action-2',
        type: 'start_session',
        flow: { uuid: 'flow-1', name: 'Welcome Flow' },
        groups: [],
        contacts: [],
        create_contact: true
      } as StartSession,
      'create-contact'
    );

    helper.testAction(
      {
        uuid: 'test-action-3',
        type: 'start_session',
        flow: { uuid: 'flow-1', name: 'Survey Flow' },
        groups: [],
        contacts: [],
        contact_query: 'household_id = @fields.household_id'
      } as StartSession & { contact_query?: string },
      'contact-query'
    );

    helper.testAction(
      {
        uuid: 'test-action-4',
        type: 'start_session',
        flow: { uuid: 'flow-1', name: 'Broadcast Flow' },
        groups: [
          { uuid: 'group-1', name: 'Subscribers' },
          { uuid: 'group-2', name: 'VIP Members' },
          { uuid: 'group-3', name: 'Newsletter' }
        ],
        contacts: []
      } as StartSession,
      'groups-only'
    );

    helper.testAction(
      {
        uuid: 'test-action-5',
        type: 'start_session',
        flow: { uuid: 'flow-1', name: 'Personal Flow' },
        groups: [],
        contacts: [
          { uuid: 'contact-1', name: 'Alice Johnson' },
          { uuid: 'contact-2', name: 'Bob Smith' }
        ]
      } as StartSession,
      'contacts-only'
    );

    helper.testAction(
      {
        uuid: 'test-action-6',
        type: 'start_session',
        flow: { uuid: 'flow-1', name: 'Mass Flow' },
        groups: [
          { uuid: 'group-1', name: 'Group 1' },
          { uuid: 'group-2', name: 'Group 2' },
          { uuid: 'group-3', name: 'Group 3' },
          { uuid: 'group-4', name: 'Group 4' },
          { uuid: 'group-5', name: 'Group 5' }
        ],
        contacts: [
          { uuid: 'contact-1', name: 'Contact 1' },
          { uuid: 'contact-2', name: 'Contact 2' }
        ]
      } as StartSession,
      'many-recipients'
    );
  });
});
