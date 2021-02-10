import { fixture, expect, assert } from "@open-wc/testing";
import TextInput from "./TextInput";

export const getInputHTML = (
  text: string = "hello",
  textarea: boolean = false,
  gsm: boolean = false,
  disabled: boolean = false,
) => {
  return `<temba-textinput value="${text}"
    ${textarea ? "textarea" : ""}
    ${gsm ? "gsm" : ""}
    ${disabled ? "disabled" : ""}
  ></temba-textinput>`;
};

describe("temba-textinput", () => {
  beforeEach(function () {});
  afterEach(function () {});

  it("can be created", async () => {
    const input: TextInput = await fixture(getInputHTML());
    assert.instanceOf(input, TextInput);
  });

  it("takes internal input changes", async () => {
    const input: TextInput = await fixture(getInputHTML("hello world", false, false, false, ));

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      ".textinput"
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal("INPUT");
    expect(widget.disabled).to.equal(false);

    // focus our widget, move back a few spots and insert some text
    await click("temba-textinput");
    await pressKey("ArrowLeft", 5);
    await type("to the ");

    // should be reflected on our main input
    expect(input.value).to.equal("hello to the world");
  });

  it("does not take internal input changes for disabled", async () => {
    const input: TextInput = await fixture(getInputHTML("hello world", false, false, true));

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      ".textinput"
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal("INPUT");
    expect(widget.disabled).to.equal(true);

    // focus our widget, move back a few spots and insert some text
    await click("temba-textinput");
    await pressKey("ArrowLeft", 5);
    await type("to the ");

    // should be reflected on our main input
    expect(input.value).to.equal("hello world");
  });

  it("takes internal textarea changes", async () => {
    const input: TextInput = await fixture(getInputHTML("hello world", true, false, false));

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      ".textinput"
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal("TEXTAREA");
    expect(widget.disabled).to.equal(false);

    // focus our widget, move back a few spots and insert some text
    await click("temba-textinput");
    await pressKey("ArrowLeft", 5);
    await type("to the ");

    // should be reflected on our main input
    expect(input.value).to.equal("hello to the world");
  });

  it("does not take internal textarea changes for disabled", async () => {
    const input: TextInput = await fixture(getInputHTML("hello world", true, false, true));

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      ".textinput"
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal("TEXTAREA");
    expect(widget.disabled).to.equal(true);

    // focus our widget, move back a few spots and insert some text
    await click("temba-textinput");
    await pressKey("ArrowLeft", 5);
    await type("to the ");

    // should be reflected on our main input
    expect(input.value).to.equal("hello world");
  });

  it("doesn't advance cursor on GSM character replacement", async () => {
    const input: TextInput = await fixture(getInputHTML("hello world", true, true));
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
