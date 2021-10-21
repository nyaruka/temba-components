export const getScrollParent = (element: HTMLElement) => {
  if (!element) {
    return window;
  }
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = /(auto|scroll)/;

  if (style.position === 'fixed') {
    return window;
  }

  let parent = element.parentElement;

  while (parent) {
    if (parent.tagName === 'BODY') {
      break;
    }

    style = getComputedStyle(parent);

    if (excludeStaticParent && style.position === 'static') {
      parent = parent.parentElement;
      continue;
    }

    if (
      overflowRegex.test(style.overflow + style.overflowY + style.overflowX)
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};
