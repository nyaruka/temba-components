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
      expect(start_session.name).to.equal('Start Flow');
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

  it('validates manual selection requires recipients', async () => {
    const formData = {
      uuid: 'start-uuid',
      flow: [{ uuid: 'flow-uuid', name: 'Registration Flow' }],
      startType: [{ value: 'manual', name: 'Select contacts and groups' }],
      recipients: []
    };

    const result = start_session.validate(formData);
    expect(result.valid).to.be.false;
    expect(result.errors.recipients).to.equal(
      'At least one contact or group must be selected'
    );
  });

  it('validates query requires contact_query value', async () => {
    const formData = {
      uuid: 'start-uuid',
      flow: [{ uuid: 'flow-uuid', name: 'Registration Flow' }],
      startType: [{ value: 'query', name: 'Query for a contact' }],
      contactQuery: ''
    };

    const result = start_session.validate(formData);
    expect(result.valid).to.be.false;
    expect(result.errors.contactQuery).to.equal('Contact query is required');
  });

  it('validates create_contact requires no additional fields', async () => {
    const formData = {
      uuid: 'start-uuid',
      flow: [{ uuid: 'flow-uuid', name: 'Registration Flow' }],
      startType: [{ value: 'create', name: 'Create a new contact' }]
    };

    const result = start_session.validate(formData);
    expect(result.valid).to.be.true;
    expect(Object.keys(result.errors).length).to.equal(0);
  });

  describe('metadata stripping', () => {
    it('should strip superfluous API metadata from flow', () => {
      const formData = {
        uuid: 'test-uuid',
        flow: [
          {
            uuid: 'flow-1',
            name: 'Registration Flow',
            type: 'message',
            archived: false,
            labels: [],
            expires: 720,
            runs: {
              active: 0,
              waiting: 5,
              completed: 100,
              interrupted: 2,
              expired: 1,
              failed: 0
            },
            results: [],
            parent_refs: [],
            created_on: '2024-01-01T00:00:00.000Z',
            modified_on: '2024-06-15T12:00:00.000Z'
          }
        ],
        startType: [{ value: 'create', name: 'Create a new contact' }]
      };

      const action = start_session.fromFormData(formData) as StartSession;

      expect(action.flow).to.deep.equal({
        uuid: 'flow-1',
        name: 'Registration Flow'
      });
    });

    it('should strip superfluous API metadata from contacts and groups', () => {
      const formData = {
        uuid: 'test-uuid',
        flow: [{ uuid: 'flow-1', name: 'Test Flow' }],
        startType: [{ value: 'manual', name: 'Select recipients manually' }],
        recipients: [
          {
            uuid: 'contact-1',
            name: 'Alice',
            status: 'active',
            language: 'eng',
            urns: ['tel:+250788123456'],
            groups: [{ uuid: 'g-1', name: 'G1' }],
            fields: { age: '30' },
            created_on: '2024-01-01T00:00:00.000Z',
            modified_on: '2024-06-15T12:00:00.000Z',
            last_seen_on: '2024-06-14T10:00:00.000Z'
          },
          {
            uuid: 'group-1',
            name: 'VIP',
            group: true,
            query: 'status = vip',
            status: 'ready',
            count: 42,
            system: false
          }
        ]
      };

      const action = start_session.fromFormData(formData) as StartSession;

      expect(action.contacts).to.have.lengthOf(1);
      expect(action.contacts[0]).to.deep.equal({
        uuid: 'contact-1',
        name: 'Alice'
      });
      expect(action.groups).to.have.lengthOf(1);
      expect(action.groups[0]).to.deep.equal({
        uuid: 'group-1',
        name: 'VIP'
      });
    });
  });
});
