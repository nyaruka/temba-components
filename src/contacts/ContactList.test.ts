import { fixture, expect, assert } from "@open-wc/testing";
import ContactList from "./ContactList";

export const getHTML = () => {
  return `<temba-contacts></temba-contacts>`;
};

describe("temba-contacts", () => {
  beforeEach(() => {});
  afterEach(() => {});

  it("can be created", async () => {
    const remote: ContactList = await fixture(getHTML());
    assert.instanceOf(remote, ContactList);
  });
});
