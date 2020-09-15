interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare const __karma__: any;

export const assertScreenshot = async (
  filename: string,
  clip: Clip,
  exclude: Clip[] = []
) => {
  const screenShotsEnabled = !!__karma__.config.args.find(
    (option: string) => option === "--screenshots"
  );

  if (screenShotsEnabled) {
    const matches = await (window as any).matchPageSnapshot(
      [`${filename}.png`],
      clip,
      []
    );

    if (!matches) {
      throw new Error("Screenshot failure");
    }
  }
};
