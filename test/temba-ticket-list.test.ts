import { fixture, assert, expect } from '@open-wc/testing';
import { TicketList } from '../src/list/TicketList';
import { getComponent, mockAPI, loadStore } from './utils.test';
import { Contact } from '../src/interfaces';

export const getHTML = () => {
  return `<temba-ticket-list></temba-ticket-list>`;
};

describe('temba-ticket-list', () => {
  beforeEach(() => {
    mockAPI();
  });

  it('can be created', async () => {
    const tickets: TicketList = await fixture(getHTML());
    assert.instanceOf(tickets, TicketList);
  });

  it('initializes with correct default properties', async () => {
    const tickets: TicketList = await fixture(getHTML());
    
    expect(tickets.agent).to.equal('');
    expect(tickets.valueKey).to.equal('ticket.uuid');
    expect(tickets.items.length).to.equal(0);
  });

  it('sets agent property correctly', async () => {
    const tickets = await getComponent('temba-ticket-list', {
      agent: 'test-agent@example.com'
    }) as TicketList;

    expect(tickets.agent).to.equal('test-agent@example.com');
  });

  describe('getRefreshEndpoint method', () => {
    it('returns base endpoint when no items exist', async () => {
      const tickets = await getComponent('temba-ticket-list', {
        endpoint: '/api/tickets.json'
      }) as TicketList;

      const refreshEndpoint = tickets.getRefreshEndpoint();
      expect(refreshEndpoint).to.equal('/api/tickets.json');
    });

    it('returns endpoint with after parameter when items exist', async () => {
      const tickets = await getComponent('temba-ticket-list', {
        endpoint: '/api/tickets.json'
      }) as TicketList;

      const lastActivity = '2023-01-01T12:00:00.000Z';
      const expectedTime = new Date(lastActivity).getTime() * 1000;
      
      // Simulate having items with ticket data
      tickets.items = [{
        ticket: {
          last_activity_on: lastActivity
        }
      }];

      const refreshEndpoint = tickets.getRefreshEndpoint();
      expect(refreshEndpoint).to.equal(`/api/tickets.json?after=${expectedTime}`);
    });
  });

  describe('sanitizeResults method', () => {
    it('processes contacts array and returns promise', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      // Load store for user resolution
      const store = await loadStore();
      tickets.store = store;

      const mockContacts: Contact[] = [
        {
          name: 'Test Contact',
          ticket: {
            uuid: 'ticket-1',
            last_activity_on: '2023-01-01T12:00:00.000Z'
          }
        } as Contact
      ];

      // Test that the method returns a promise and processes the input
      const resultPromise = tickets.sanitizeResults(mockContacts);
      expect(resultPromise).to.be.instanceOf(Promise);
      
      // For coverage, we can test that it handles the input correctly
      // even if the full user resolution flow is complex
      const result = await resultPromise;
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
    });

    it('handles empty results array', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      // Load store for user resolution
      const store = await loadStore();
      tickets.store = store;

      const result = await tickets.sanitizeResults([]);
      
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });
  });

  describe('rendering', () => {
    it('renders contact with ticket information', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      const mockContact: Contact = {
        name: 'John Doe',
        ticket: {
          uuid: 'ticket-123',
          assignee: { 
            name: 'Agent Smith', 
            email: 'agent@example.com',
            avatar: '/avatar.jpg'
          },
          last_activity_on: '2023-01-01T12:00:00.000Z',
          closed_on: null
        },
        last_msg: {
          direction: 'I',
          text: 'Hello, I need help',
          attachments: null
        }
      } as Contact;

      const rendered = tickets.renderOption(mockContact);
      expect(rendered).to.exist;
    });

    it('renders contact with attachment message', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      const mockContact: Contact = {
        name: 'Jane Doe',
        ticket: {
          uuid: 'ticket-456',
          assignee: null,
          last_activity_on: '2023-01-01T12:00:00.000Z',
          closed_on: null
        },
        last_msg: {
          direction: 'O',
          text: null,
          attachments: [{ name: 'file.pdf' }]
        }
      } as Contact;

      const rendered = tickets.renderOption(mockContact);
      expect(rendered).to.exist;
    });

    it('renders closed ticket correctly', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      const mockContact: Contact = {
        name: 'Closed Ticket Contact',
        ticket: {
          uuid: 'ticket-789',
          assignee: { 
            name: 'Agent Jones', 
            email: 'jones@example.com',
            avatar: '/jones.jpg'
          },
          last_activity_on: '2023-01-01T10:00:00.000Z',
          closed_on: '2023-01-01T12:00:00.000Z'
        },
        last_msg: {
          direction: 'I',
          text: 'Thank you for your help',
          attachments: null
        }
      } as Contact;

      const rendered = tickets.renderOption(mockContact);
      expect(rendered).to.exist;
    });

    it('renders contact without last message', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      const mockContact: Contact = {
        name: 'No Message Contact',
        ticket: {
          uuid: 'ticket-000',
          assignee: null,
          last_activity_on: '2023-01-01T12:00:00.000Z',
          closed_on: null
        },
        last_msg: null
      } as Contact;

      const rendered = tickets.renderOption(mockContact);
      expect(rendered).to.exist;
    });

    it('renders unsupported message type', async () => {
      const tickets = await getComponent('temba-ticket-list') as TicketList;
      
      const mockContact: Contact = {
        name: 'Unsupported Message Contact',
        ticket: {
          uuid: 'ticket-999',
          assignee: null,
          last_activity_on: '2023-01-01T12:00:00.000Z',
          closed_on: null
        },
        last_msg: {
          direction: 'I',
          text: null,
          attachments: null
        }
      } as Contact;

      const rendered = tickets.renderOption(mockContact);
      expect(rendered).to.exist;
    });
  });
});
