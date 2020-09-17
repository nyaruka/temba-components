import Select from "./Select";
import { fixture, expect, assert } from "@open-wc/testing";
import Options from "../options/Options";
import sinon from "sinon";
import moxios from "moxios";
import Store from "../store/Store";
import completion from "../../test-assets/store/completion.json";

export const colorResponse: any = {
  next: null,
  previous: null,
  results: [
    { name: "Red", value: "red" },
    { name: "Green", value: "green" },
    { name: "Blue", value: "blue" },
  ],
};

export const createSelect = async (def: string, delay: number = 0) => {
  var clock = sinon.useFakeTimers();
  const select: Select = await fixture(def);
  clock.tick(1);
  await select.updateComplete;
  await (window as any).waitFor(delay);
  clock.restore();
  return select;
};

export const search = async (select: Select, query: string) => {
  var clock = sinon.useFakeTimers();

  var search = select.shadowRoot.querySelector(
    "temba-field .searchbox"
  ) as HTMLInputElement;

  search.value = query;
  search.dispatchEvent(new Event("input"));
  clock.tick(300);
  await select.updateComplete;
  await select.updateComplete;
  clock.restore();

  return select;
};

export const open = async (select: Select) => {
  var clock = sinon.useFakeTimers();

  (select.shadowRoot.querySelector(
    ".select-container"
  ) as HTMLDivElement).click();

  await select.updateComplete;
  // searchable has a quiet of 200ms
  clock.tick(200);
  await select.updateComplete;

  clock.restore();

  return select;
};

export const getOptions = (select: Select): Options => {
  return select.shadowRoot.querySelector("temba-options");
};

export const clickOption = async (select: Select, index: number) => {
  const options = getOptions(select);
  const option = options.shadowRoot.querySelectorAll(".option")[
    index
  ] as HTMLElement;

  option.click();
  return option;
};

export const openAndClick = async (select: Select, index: number) => {
  await open(select);
  return clickOption(select, index);
};

export const colors = [
  { name: "Red", value: "0" },
  { name: "Green", value: "1" },
  { name: "Blue", value: "2" },
];

export const getSelectHTML = (
  options: any[] = colors,
  attrs: any = {}
): string => {
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

describe("temba-select", () => {
  beforeEach(function () {
    moxios.install();
  });

  afterEach(function () {
    moxios.uninstall();
  });

  it("can be created", async () => {
    const select = await createSelect("<temba-select></temba-select>");
    assert.instanceOf(select, Select);
  });

  it("can be created with temba-option tags", async () => {
    const select = await createSelect(getSelectHTML());
    assert.equal(select.getStaticOptions().length, 3);
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
    });

    it("can search with existing selection", async () => {
      const select = await createSelect(
        getSelectHTML(colors, { searchable: true })
      );

      // select the first option
      await openAndClick(select, 1);
      expect(select.values.length).to.equal(1);
      expect(select.values[0].name).to.equal("Green");

      // for single selection our current selection should be in the list and focused
      await open(select);
      assert.equal(select.cursorIndex, 1);
      assert.equal(select.visibleOptions.length, 3);

      // now lets do a search, we should see our selection (green) and one other (red)
      await search(select, "re");
      await open(select);
      assert.equal(select.visibleOptions.length, 2);

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
