import {
  fixture,
  html,
  expect,
  assert,
  fixtureSync,
  oneEvent,
  waitUntil,
} from "@open-wc/testing";
import Store from "./Store";
import sinon from "sinon";
import { CompletionSchema } from "../completion/helpers";
import moxios from "moxios";
var clock: any;

import completion from "../../test-assets/store/completion.json";
import functions from "../../test-assets/store/functions.json";
import globals from "../../test-assets/store/globals.json";
import fields from "../../test-assets/store/fields.json";

const createStore = async (def: string): Promise<Store> => {
  return await fixture(def);
};

describe("temba-store", () => {
  beforeEach(function () {
    clock = sinon.useFakeTimers();

    moxios.stubRequest("/completion.json", {
      status: 200,
      responseText: JSON.stringify(completion),
    });

    moxios.stubRequest("/functions.json", {
      status: 200,
      responseText: JSON.stringify(functions),
    });

    moxios.stubRequest("/globals.json", {
      status: 200,
      responseText: JSON.stringify(globals),
    });

    moxios.stubRequest("/fields.json", {
      status: 200,
      responseText: JSON.stringify(fields),
    });
  });

  afterEach(function () {
    clock.restore();
  });

  it("is defined", async () => {
    const store = await createStore("<temba-store></temba-store>");
    assert.instanceOf(store, Store);
  });

  it("completion schema", async () => {
    const store: Store = await fixture(
      "<temba-store completions='/completion.json'></temba-store>"
    );
    assert.equal(store.getCompletionSchema().types.length, 13);
  });

  it("function list", async () => {
    const store: Store = await fixture(
      "<temba-store functions='/functions.json'></temba-store>"
    );
    assert.equal(store.getFunctions().length, 74);
  });

  it("globals", async () => {
    const store: Store = await fixture(
      "<temba-store globals='/globals.json'></temba-store>"
    );

    // wait for asset loading
    await store.updateComplete;
    await store.updateComplete;

    assert.equal(store.getKeyedAssets().globals.length, 2);
  });

  it("fields", async () => {
    const store: Store = await fixture(
      "<temba-store fields='/fields.json'></temba-store>"
    );

    // wait for asset loading
    await store.updateComplete;
    await store.updateComplete;

    assert.equal(store.getKeyedAssets().fields.length, 5);
  });
});
