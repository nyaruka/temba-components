import { fixture, assert } from '@open-wc/testing';
import { TicketList } from '../src/list/TicketList';
import './utils.test';
export const getHTML = () => {
    return `<temba-ticket-list></temba-ticket-list>`;
};
describe('temba-ticket-list', () => {
    it('can be created', async () => {
        const tickets = await fixture(getHTML());
        assert.instanceOf(tickets, TicketList);
    });
});
//# sourceMappingURL=temba-ticket-list.test.js.map