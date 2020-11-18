import { fixture, expect, assert } from "@open-wc/testing";
import sinon from "sinon";
import TextInput from "./TextInput";

const getInputHTML = (textarea: boolean = false) => {
  return `<temba-textinput value="hello" ${
    textarea ? "textarea" : ""
  }></temba-textinput>`;
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
});
