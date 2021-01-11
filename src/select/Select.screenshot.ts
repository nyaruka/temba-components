import {
  createSelect,
  getSelectHTML,
  open,
  openAndClick,
  colors,
} from "./Select.test";
import moxios from "moxios";
import sinon from "sinon";
import { assertScreenshot } from "../../test/utils";
import { fixture } from "@open-wc/testing";
import completion from "../../test-assets/store/completion.json";
import functions from "../../test-assets/store/functions.json";

const closedClip = {
  y: 70,
  x: 0,
  width: 485,
  height: 55,
};

const clip = (height: number = 55) => {
  return { ...closedClip, height };
};

(window as any).setViewport({
  width: 500,
  height: 1000,
  deviceScaleFactor: 2,
});

const loadStore = async () => {
  moxios.stubRequest("/completion.json", {
    status: 200,
    responseText: JSON.stringify(completion),
  });

  moxios.stubRequest("/functions.json", {
    status: 200,
    responseText: JSON.stringify(functions),
  });

  await fixture(
    "<temba-store completions='/completion.json' functions='/functions.json'></temba-store>"
  );
};

const pause = 500;

describe("temba-select-screenshots", () => {
  var clock: any;
  beforeEach(async function () {
    clock = sinon.useFakeTimers();
    moxios.install();
  });

  afterEach(function () {
    clock.restore();
    moxios.uninstall();
  });

  it("should look ready for selection", async () => {
    await createSelect(getSelectHTML(), pause);
    await assertScreenshot("select", clip());
  });

  it("should show open list with placeholder text", async () => {
    const select = await createSelect(getSelectHTML(), pause);
    await open(select);
    await assertScreenshot("select-open", clip(160));
  });

  it("should show single selected option", async () => {
    const select = await createSelect(getSelectHTML(), pause);

    // select the first option
    await openAndClick(select, 0);
    await assertScreenshot("select-selected", clip());
  });

  it("should look the same with search enabled", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      pause
    );
    await assertScreenshot("select-search", clip());
  });

  it("should look the same with search enabled and selection made", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      pause
    );

    // select the first option
    await openAndClick(select, 1);
    await assertScreenshot("select-search-selected", clip());
  });

  it("should show focus for the selected option", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      pause
    );

    // select the first option
    await openAndClick(select, 1);

    // now open and look at focus
    await open(select);
    await assertScreenshot("select-search-selected-open", clip(160));
  });

  it("should show search with existing selection", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      pause
    );

    // select the first option
    await openAndClick(select, 1);
    await open(select);

    // now lets do a search, we should see our selection (green) and one other (red)
    await typeInto("temba-select", "re");
    await open(select);

    await assertScreenshot("select-search-selected-open-query", clip(130));
  });

  it("should show search with existing multiple selection", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true, multi: true }),
      pause
    );

    // select the first option
    await openAndClick(select, 0);
    await openAndClick(select, 0);
    await open(select);

    // now lets do a search, we should see our selection (green) and one other (red)
    await typeInto("temba-select", "re");
    await open(select);

    // should have two things selected and active query and no matching options
    await assertScreenshot(
      "select-search-multi-selected-open-query",
      clip(130)
    );
  });

  it("should allow expressions", async () => {
    await loadStore();

    const select = await createSelect(
      getSelectHTML(colors, { searchable: true, expressions: true }),
      pause
    );

    await typeInto("temba-select", "@cont");
    await open(select);

    await assertScreenshot("select-expression", clip(130));
  });

  it("should show functions", async () => {
    await loadStore();

    const select = await createSelect(
      getSelectHTML(colors, { searchable: true, expressions: true }),
      pause
    );

    await typeInto("temba-select", "look at @(max(m");
    await open(select);

    await assertScreenshot("select-expression-function", clip(250));
  });

  it("shows clear option", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { clearable: true })
    );
    await openAndClick(select, 0);
    await assertScreenshot("select-clearable", clip());
  });
});
