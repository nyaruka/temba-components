import Select from "./Select";
import {
  createSelect,
  getSelectHTML,
  open,
  openAndClick,
  colors,
  search,
} from "./Select.test";
import moxios from "moxios";
import sinon from "sinon";
import { assertScreenshot } from "../../test/utils";

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
    await createSelect(getSelectHTML(), 1000);
    await assertScreenshot("select", clip());
  });

  it("should show open list with placeholder text", async () => {
    const select = await createSelect(getSelectHTML(), 1000);
    await open(select);
    await assertScreenshot("select-open", clip(160));
  });

  it("should show single selected option", async () => {
    const select = await createSelect(getSelectHTML(), 1000);

    // select the first option
    await openAndClick(select, 0);
    await assertScreenshot("select-selected", clip());
  });

  it("should look the same with search enabled", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      1000
    );
    await assertScreenshot("select-search", clip());
  });

  it("should look the same with search enabled and selection made", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      1000
    );

    // select the first option
    await openAndClick(select, 1);
    await assertScreenshot("select-search-selected", clip());
  });

  it("should show focus for the selected option", async () => {
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true }),
      1000
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
      1000
    );

    // select the first option
    await openAndClick(select, 1);
    await open(select);

    // now lets do a search, we should see our selection (green) and one other (red)
    await search(select, "re");
    await open(select);

    await assertScreenshot("select-search-selected-open-query", clip(130));
  });

  it("should show search with existing multiple selection", async () => {
    console.log(getSelectHTML(colors, { searchable: true, multi: true }));
    const select = await createSelect(
      getSelectHTML(colors, { searchable: true, multi: true }),
      1000
    );

    // select the first option
    await openAndClick(select, 0);
    await openAndClick(select, 0);
    await open(select);

    // now lets do a search, we should see our selection (green) and one other (red)
    await search(select, "re");
    await open(select);

    // should have two things selected and active query and no matching options
    await assertScreenshot(
      "select-search-multi-selected-open-query",
      clip(130)
    );
  });
});
