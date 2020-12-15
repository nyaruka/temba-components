interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare const __karma__: any;

export const delay = (millis: number) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, millis);
  });
};

export const assertScreenshot = async (
  filename: string,
  clip: Clip,
  threshold: number = 0.1,
  exclude: Clip[] = []
) => {
  const screenShotsEnabled = !!__karma__.config.args.find(
    (option: string) => option === "--screenshots"
  );

  if (screenShotsEnabled) {
    await (window as any).waitFor(300);

    const matches = await (window as any).matchPageSnapshot(
      [`${filename}.png`],
      clip,
      exclude,
      threshold
    );

    if (!matches) {
      throw new Error("Screenshot failure");
    }
  }
};

export const waitForSelector = async (selector: string[]) => {
  if (!Array.isArray(selector)) {
    selector = [selector];
  }

  // wait for our element to appear
  return await await (window as any).waitForFunction(
    (selector: string[]) => {
      let root = document as any;
      for (let i = 0; i < selector.length; i++) {
        const step = selector[i];
        root = root.querySelector(step);
        if (!root) {
          return false;
        }

        if (i < selector.length - 1) {
          root = root.shadowRoot;
        }
      }
      return root;
    },
    {},
    selector
  );
};
