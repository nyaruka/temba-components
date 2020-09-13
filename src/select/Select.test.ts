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

const createSelect = async (def: string) => {
  const select: Select = await fixture(def);
  clock.tick(1);
  // document.body.appendChild(select);
  await select.updateComplete;
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

const colorOptions =
  "<temba-select placeholder='Pick a color'>" +
  "<temba-option name='Red' value='0'></temba-option>" +
  "<temba-option name='Green' value='1'></temba-option>" +
  "<temba-option name='Blue' value='2'></temba-option>" +
  "</temba-select>";

const multiColorOptions =
  "<temba-select placeholder='Pick a color' multi>" +
  "<temba-option name='Red' value='0'></temba-option>" +
  "<temba-option name='Green' value='1'></temba-option>" +
  "<temba-option name='Blue' value='2'></temba-option>" +
  "</temba-select>";

describe("temba-select", () => {
  it("is defined", async () => {
    const select = await createSelect("<temba-select></temba-select>");
    assert.instanceOf(select, Select);
  });

  it("creates options", async () => {
    var select = await createSelect(colorOptions);

    await open(select);
    const options = getOptions(select);
    assert.instanceOf(options, Options);

    const optionsHTML = options.shadowRoot.innerHTML;
    expect(optionsHTML).to.contain("Red");
    expect(optionsHTML).to.contain("Green");
    expect(optionsHTML).to.contain("Blue");

    // our options should be visible
    assert.isTrue(
      options.shadowRoot
        .querySelector(".options-container")
        .classList.contains("show")
    );
  });

  it("can select a single option", async () => {
    const select = await createSelect(colorOptions);
    expect(select.values.length).to.equal(0);

    // select the first option
    await openAndClick(select, 0);

    expect(select.values.length).to.equal(1);
    expect(select.values[0].name).to.equal("Red");
    expect(select.shadowRoot.innerHTML).to.contain("Red");
  });

  it("can select multiple options", async () => {
    const select = await createSelect(multiColorOptions);
    expect(select.values.length).to.equal(0);

    // select the first option twice
    await openAndClick(select, 0);
    await openAndClick(select, 0);

    // now we should have red and green selected
    expect(select.values.length).to.equal(2);
    expect(select.shadowRoot.innerHTML).to.contain("Red");
    expect(select.shadowRoot.innerHTML).to.contain("Green");
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

      // wait for the open, and then the fetch
      await select.updateComplete;
      await select.updateComplete;

      assert.equal(select.visibleOptions.length, 2);
    });

    it("can enter expressions", async () => {
      moxios.stubRequest("/completion.json", {
        status: 200,
        responseText: JSON.stringify(completion),
      });

      const store: Store = await fixture(
        "<temba-store completions='/completion.json'></temba-store>"
      );

      const select = await createSelect(
        "<temba-select placeholder='Pick a color' endpoint='/colors.json' searchable expressions></temba-select>"
      );

      await search(select, "@contact");
      await open(select);

      // wait for the open, and then the fetch
      await select.updateComplete;
      await select.updateComplete;

      assert.equal(select.completionOptions.length, 12);
    });
  });
});
