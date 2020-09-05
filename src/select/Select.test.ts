import Select from "./Select";
import { fixture, html, expect, assert } from "@open-wc/testing";
import sinon from "sinon";
import { use } from "chai";
import { matchSnapshot } from "chai-karma-snapshot";
import Options from "../options/Options";

use(matchSnapshot);

var clock: any;
beforeEach(function () {
  clock = sinon.useFakeTimers();
});

afterEach(function () {
  clock.restore();
});

const createSelect = async (def: string) => {
  const select: Select = await fixture(def);
  clock.tick(1);
  // document.body.appendChild(select);
  await select.updateComplete;
  return select;
};

const open = async (select: Select) => {
  (select.shadowRoot.querySelector(
    ".select-container"
  ) as HTMLDivElement).click();

  await select.updateComplete;
  clock.tick(1);
  await select.updateComplete;
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
};

const openAndClick = async (select: Select, index: number) => {
  await open(select);
  await clickOption(select, index);
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
    var select = await createSelect(colorOptions);
    expect(select.values.length).to.equal(0);

    // select the first option
    await openAndClick(select, 0);

    expect(select.values.length).to.equal(1);
    expect(select.values[0].name).to.equal("Red");
    expect(select.shadowRoot.innerHTML).to.contain("Red");
  });

  it("can select multiple options", async () => {
    var select = await createSelect(multiColorOptions);
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
