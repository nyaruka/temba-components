import axios from "axios";
import Select from "./Select";
import { fixture, html, expect, assert } from "@open-wc/testing";
import { use } from "chai";
import { matchSnapshot } from "chai-karma-snapshot";
import Options from "../options/Options";
import sinon from "sinon";
import moxios from "moxios";
import Store from "../store/Store";
import completion from "../../test-assets/store/completion.json";
import { assertScreenshot } from "../../test/utils";

const colorResponse: any = {
  next: null,
  previous: null,
  results: [
    { name: "Red", value: "red" },
    { name: "Green", value: "green" },
    { name: "Blue", value: "blue" },
  ],
};

use(matchSnapshot);

var clock: any;
beforeEach(function () {
  clock = sinon.useFakeTimers();
  moxios.install();
});

afterEach(function () {
  clock.restore();
  moxios.uninstall();
});

const createSelect = async (def: string, delay: number = 1000) => {
  const select: Select = await fixture(def);
  clock.tick(1);
  await select.updateComplete;
  await (window as any).waitFor(delay);
  return select;
};

const search = async (select: Select, query: string) => {
  var search = select.shadowRoot.querySelector(
    "temba-field .searchbox"
  ) as HTMLInputElement;
  search.value = query;
  search.dispatchEvent(new Event("input"));
  clock.tick(300);
  await select.updateComplete;
  await select.updateComplete;

  return select;
};

const open = async (select: Select) => {
  (select.shadowRoot.querySelector(
    ".select-container"
  ) as HTMLDivElement).click();

  await select.updateComplete;
  // searchable has a quiet of 200ms
  clock.tick(200);
  await select.updateComplete;
  return select;
};

const getOptions = (select: Select): Options => {
  return select.shadowRoot.querySelector("temba-options");
};

const clickOption = async (select: Select, index: number) => {
  const options = getOptions(select);
  const option = options.shadowRoot.querySelectorAll(".option")[
    index
  ] as HTMLElement;

  option.click();
  return option;
};

const openAndClick = async (select: Select, index: number) => {
  await open(select);
  return clickOption(select, index);
};

const colors = [
  { name: "Red", value: "0" },
  { name: "Green", value: "1" },
  { name: "Blue", value: "2" },
];

const getSelectHTML = (options: any[] = colors, attrs: any = {}): string => {
  return `
  <temba-select placeholder='Pick a color' ${Object.keys(attrs).map(
    (name: string) => `${name}='${attrs[name]}'`
  )}>
    ${options
      .map(
        (option) =>
          `<temba-option name="${option.name}" value="${option.value}"></temba-option>`
      )
      .join("")}
  </temba-select>`;
};

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
  deviceScaleFactor: 1,
});

describe("temba-select", () => {
  it("can be created", async () => {
    const select = await createSelect("<temba-select></temba-select>");
    assert.instanceOf(select, Select);
  });

  it("can be created with temba-option tags", async () => {
    await createSelect(getSelectHTML());
    await assertScreenshot("select", clip());
  });

  it("shows options when opened open", async () => {
    var select = await createSelect(getSelectHTML());
    await open(select);
    const options = getOptions(select);
    assert.instanceOf(options, Options);

    // our options should be visible
    assert.isTrue(
      options.shadowRoot
        .querySelector(".options-container")
        .classList.contains("show")
    );

    await assertScreenshot("select-open", clip(160));
  });

  it("can be created with attribute options", async () => {
    const options = JSON.stringify([{ name: "Embedded Option", value: "0" }]);
    const select = await createSelect(getSelectHTML([], { options }));
    // select the first option
    await openAndClick(select, 0);
    expect(select.values[0].name).to.equal("Embedded Option");
  });

  describe("single selection", () => {
    it("can select a single option", async () => {
      const select = await createSelect(getSelectHTML());
      expect(select.values.length).to.equal(0);

      // select the first option
      await openAndClick(select, 0);

      expect(select.values.length).to.equal(1);
      expect(select.values[0].name).to.equal("Red");
      expect(select.shadowRoot.innerHTML).to.contain("Red");

      await assertScreenshot("select-selected", clip());
    });

    it("can search ", async () => {
      const select = await createSelect(
        getSelectHTML(colors, { searchable: true })
      );
      await assertScreenshot("select-search", clip());
    });

    it("can search with existing selection", async () => {
      const select = await createSelect(
        getSelectHTML(colors, { searchable: true })
      );

      // select the first option
      await openAndClick(select, 1);
      expect(select.values.length).to.equal(1);
      expect(select.values[0].name).to.equal("Green");

      await assertScreenshot("select-search-selected", clip());

      // for single selection our current selection should be in the list and focused
      await open(select);
      assert.equal(select.cursorIndex, 1);
      assert.equal(select.visibleOptions.length, 3);

      await assertScreenshot("select-search-selected-open", clip(160));

      // now lets do a search, we should see our selection (green) and one other (red)
      await search(select, "re");
      await open(select);

      assert.equal(select.visibleOptions.length, 2);
      await assertScreenshot("select-search-selected-open-query", clip(130));

      // but our cursor should be on the first match
      assert.equal(select.cursorIndex, 0);
    });
  });

  describe("multiple selection", () => {
    it("can select multiple options", async () => {
      const select = await createSelect(getSelectHTML(colors, { multi: true }));
      expect(select.values.length).to.equal(0);

      // select the first option twice
      await openAndClick(select, 0);
      await openAndClick(select, 0);

      // now we should have red and green selected
      expect(select.values.length).to.equal(2);
      expect(select.shadowRoot.innerHTML).to.contain("Red");
      expect(select.shadowRoot.innerHTML).to.contain("Green");
    });
  });

  describe("endpoints", () => {
    beforeEach(function () {
      // Match against an exact URL value
      moxios.stubRequest(/colors\.json.*/, {
        status: 200,
        responseText: JSON.stringify(colorResponse),
      });
    });

    it("can load from an endpoint", (done) => {
      createSelect(
        "<temba-select placeholder='Pick a color' endpoint='/colors.json'></temba-select>"
      ).then((select: Select) => {
        open(select).then(() => {
          // wait for the open
          select.updateComplete.then(() => {
            // wait for the fetch to complete
            select.updateComplete.then(() => {
              try {
                assert.equal(select.visibleOptions.length, 3);
                done();
              } catch (e) {
                done(e);
              }
            });
          });
        });
      });
    });

    it("can search an endpoint", async () => {
      const select = await createSelect(
        "<temba-select placeholder='Pick a color' endpoint='/colors.json' searchable></temba-select>"
      );

      await search(select, "re");
      await open(select);

      // wait for remote fetch
      await select.updateComplete;
      await select.updateComplete;

      assert.equal(select.visibleOptions.length, 2);
    });

    it("can enter expressions", async () => {
      moxios.stubRequest("/completion.json", {
        status: 200,
        responseText: JSON.stringify(completion),
      });

      await fixture(
        "<temba-store completions='/completion.json'></temba-store>"
      );

      const select = await createSelect(
        "<temba-select placeholder='Pick a color' endpoint='/colors.json' searchable expressions></temba-select>"
      );

      await search(select, "@contact");
      await open(select);

      assert.equal(select.completionOptions.length, 12);
    });
  });
});
