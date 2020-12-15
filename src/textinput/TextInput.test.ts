import { fixture, expect, assert } from "@open-wc/testing";
import { assertScreenshot, waitForSelector } from "../../test/utils";
import TextInput from "./TextInput";

export const getInputHTML = (
  textarea: boolean = false,
  gsm: boolean = false
) => {
  return `<temba-textinput value="hello" 
    ${textarea ? "textarea" : ""}
    ${gsm ? "gsm" : ""}
  ></temba-textinput>`;
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

describe("temba-textinput", () => {
  beforeEach(function () {});
  afterEach(function () {});

  it("can be created", async () => {
    const input: TextInput = await fixture(getInputHTML());
    assert.instanceOf(input, TextInput);
  });

  it("takes internal input changes", async () => {
    const input: TextInput = await fixture(getInputHTML());

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      ".textinput"
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal("INPUT");
    widget.value = "world";
    widget.dispatchEvent(new InputEvent("change"));

    // should be reflected on our main input
    expect(input.value).to.equal("world");
  });

  it("takes internal textarea changes", async () => {
    const input: TextInput = await fixture(getInputHTML(true));

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      ".textinput"
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal("TEXTAREA");

    widget.value = "world";
    widget.dispatchEvent(new InputEvent("change"));

    // should be reflected on our main input
    expect(input.value).to.equal("world");
  });

  it("doesn't advance cursor on GSM character replacement", async () => {
    const input: TextInput = await fixture(getInputHTML(true, true));
    input.value = "Let’s try some text with a funny tick.";

    // focus our widget, move back a few spots and insert some text
    await click("temba-textinput");
    await pressKey("ArrowLeft", 5);
    await type("replaced ");

    expect(input.value).to.equal(
      "Let's try some text with a funny replaced tick."
    );
  });
});
