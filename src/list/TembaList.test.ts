import { fixture, expect, assert } from "@open-wc/testing";
import TembaList from "./TembaList";

export const getListHTML = () => {
  return `<temba-list></temba-list>`;
};

describe("temba-list", () => {
  beforeEach(() => {});
  afterEach(() => {});

  it("can be created", async () => {
    const list: TembaList = await fixture(getListHTML());
    assert.instanceOf(list, TembaList);
  });
});
