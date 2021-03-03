import { fixture, expect, assert } from "@open-wc/testing";
import ContactList from "./TicketList";

export const getHTML = () => {
  return `<temba-tickets></temba-tickets>`;
};

describe("temba-contacts", () => {
  beforeEach(() => {});
  afterEach(() => {});

  it("can be created", async () => {
    const remote: ContactList = await fixture(getHTML());
    assert.instanceOf(remote, ContactList);
  });
});
