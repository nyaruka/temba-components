// ---------------------------------------------------------------------------
// Cursor management utilities for contenteditable
// Newlines are represented as \n characters inside <span class="tok-newline">
// elements, so they're handled as regular text by cursor utilities.
// Browser-added <br> artifacts are ignored (treated as zero-length).
// ---------------------------------------------------------------------------

/** Gets the Selection object, handling shadow DOM. */
export function getSelectionFromRoot(element: HTMLElement): Selection | null {
  const root = element.getRootNode() as ShadowRoot;
  if ((root as any).getSelection) {
    return (root as any).getSelection();
  }
  return window.getSelection();
}

/** Returns the plain-text length of a DOM node. Ignores browser <br> artifacts. */
function nodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.length;
  }
  // Ignore browser-added <br> artifacts
  if (node.nodeName === 'BR') {
    return 0;
  }
  let len = 0;
  for (const child of Array.from(node.childNodes)) {
    len += nodeTextLength(child);
  }
  return len;
}

/** Converts a DOM selection position (container + offset) to a plain-text offset. */
function domPositionToTextOffset(
  root: Node,
  targetContainer: Node,
  targetOffset: number
): number {
  let total = 0;

  const walk = (node: Node): boolean => {
    if (node === targetContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += targetOffset;
      } else {
        // offset is a child index
        for (let i = 0; i < targetOffset && i < node.childNodes.length; i++) {
          total += nodeTextLength(node.childNodes[i]);
        }
      }
      return true; // found
    }

    if (node.nodeType === Node.TEXT_NODE) {
      total += node.textContent.length;
      return false;
    }
    // Ignore browser-added <br> artifacts
    if (node.nodeName === 'BR') {
      return false;
    }

    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true;
    }
    return false;
  };

  walk(root);
  return total;
}

/** Converts a plain-text offset to a DOM position (node + offset). */
function textOffsetToDomPosition(
  root: Node,
  targetOffset: number
): { node: Node; offset: number } | null {
  let remaining = targetOffset;

  const walk = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= node.textContent.length) {
        return { node, offset: remaining };
      }
      remaining -= node.textContent.length;
      return null;
    }
    // Ignore browser-added <br> artifacts
    if (node.nodeName === 'BR') {
      return null;
    }

    for (const child of Array.from(node.childNodes)) {
      const result = walk(child);
      if (result) return result;
    }
    return null;
  };

  return walk(root);
}

/**
 * Extracts plain text from the contenteditable DOM by walking our span structure.
 * Ignores browser-added <br> artifacts. Our newlines are \n chars inside spans.
 */
export function getTextFromEditableDiv(element: HTMLElement): string {
  let text = '';
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Skip browser-added <br> artifacts
      if (child.nodeName === 'BR') {
        continue;
      }
      // Recurse into spans and other elements
      text += getTextFromEditableDiv(child as HTMLElement);
    }
  }
  return text;
}

/** Gets the caret (selection start) as a plain-text offset. */
export function getCaretOffset(element: HTMLElement): number {
  const selection = getSelectionFromRoot(element);
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  return domPositionToTextOffset(
    element,
    range.startContainer,
    range.startOffset
  );
}

/** Gets the selection end as a plain-text offset. */
export function getCaretEndOffset(element: HTMLElement): number {
  const selection = getSelectionFromRoot(element);
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  return domPositionToTextOffset(element, range.endContainer, range.endOffset);
}

/** Sets the caret to a plain-text offset. */
export function setCaretOffset(element: HTMLElement, offset: number): void {
  const pos = textOffsetToDomPosition(element, offset);
  if (!pos) return;
  const selection = getSelectionFromRoot(element);
  if (!selection) return;
  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Sets a selection range by plain-text offsets. */
export function setCaretRange(
  element: HTMLElement,
  start: number,
  end: number
): void {
  const startPos = textOffsetToDomPosition(element, start);
  const endPos = textOffsetToDomPosition(element, end);
  if (!startPos || !endPos) return;
  const selection = getSelectionFromRoot(element);
  if (!selection) return;
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}
