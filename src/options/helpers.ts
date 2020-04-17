export const getScrollParent = (element: HTMLElement) => {
  // console.log("finding parent for", element);
  if (!element) {
    return window;
  }
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === "absolute";
  const overflowRegex = /(auto|scroll)/;

  if (style.position === "fixed") {
    return window;
  }

  console.log("--------------");
  let parent = element.parentElement;

  while (parent) {
    console.log(parent);

    if (parent.tagName === "BODY") {
      break;
    }

    style = getComputedStyle(parent);

    if (excludeStaticParent && style.position === "static") {
      console.log("Skipping for static check");
      parent = parent.parentElement;
      continue;
    }

    if (
      overflowRegex.test(style.overflow + style.overflowY + style.overflowX)
    ) {
      console.log("Returning", parent);
      return parent;
    }

    parent = parent.parentElement;
  }

  console.log("returning window");

  return window;
};
