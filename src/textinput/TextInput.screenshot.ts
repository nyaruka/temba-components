import { getInputHTML } from "./TextInput.test";
import moxios from "moxios";
import sinon from "sinon";
import { assertScreenshot } from "../../test/utils";
import TextInput from "./TextInput";
import { assert, fixture } from "@open-wc/testing";

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

  it("should render input", async () => {
    const input: TextInput = await fixture(getInputHTML());
    assert.instanceOf(input, TextInput);
    await assertScreenshot("textinput", clip());
  });

  it("should render textarea", async () => {
    const input: TextInput = await fixture(getInputHTML(true));
    assert.instanceOf(input, TextInput);
    await assertScreenshot("textinput-textarea", clip(70));
  });
});
