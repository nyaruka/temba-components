export const getMiddle = (a: DOMRect, b: DOMRect) => {
  return a.top + a.height / 2 - b.height / 2;
};

export const getCenter = (a: DOMRect, b: DOMRect) => {
  return a.left + a.width / 2 - b.width / 2;
};
