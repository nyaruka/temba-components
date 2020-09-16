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
  threshold: number = 0.35,
  exclude: Clip[] = []
) => {
  const screenShotsEnabled = !!__karma__.config.args.find(
    (option: string) => option === "--screenshots"
  );

  if (screenShotsEnabled) {
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
