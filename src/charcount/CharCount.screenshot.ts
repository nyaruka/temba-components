import { fixture } from "@open-wc/testing";
import { assertScreenshot } from "../../test/utils";
import CharCount from "./CharCount";
const hiddenClip = {
  y: 79,
  x: 270,
  width: 210,
};

const clip = (height: number = 30) => {
  return { ...hiddenClip, height };
};

describe.only("temba-charcount-screenshots", () => {
  it("counts plain text", async () => {
    const counter: CharCount = await fixture(
      "<temba-charcount text='count this text'></temba-charcount>"
    );
    await assertScreenshot("count-text", clip());
  });

  it("counts variables", async () => {
    const counter: CharCount = await fixture(
      "<temba-charcount text='hi @contact.name'></temba-charcount>"
    );
    await assertScreenshot("count-variable", clip());
  });

  it("counts unicode", async () => {
    const counter: CharCount = await fixture(
      "<temba-charcount text='Messages with 🎱 count extra segments after 70 characters. This message should show two segments.'></temba-charcount>"
    );
    await assertScreenshot("count-unicode", clip());
  });

  it("counts unicode with variables", async () => {
    const counter: CharCount = await fixture(
      "<temba-charcount text='@contact.name with 🎱 count extra segments after 70 characters. This message should show two segments.'></temba-charcount>"
    );
    await assertScreenshot("count-unicode-variables", clip());
  });

  it("shows hover summary", async () => {
    const counter: CharCount = await fixture(
      "<temba-charcount class='.count' text='@contact.name with 🎱 count extra segments after 70 characters. This message should show two segments.'></temba-charcount>"
    );

    const page = window as any;
    // await page.waitFor(1500);
    // await page.hover(".count");
    await page.moveMouse(350, 90);

    await assertScreenshot("count-summary", clip(220));
  });
});
