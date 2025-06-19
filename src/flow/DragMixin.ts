import { getStore } from '../store/Store';
import { FlowPosition } from '../store/flow-definition';

export interface DragState {
  isDragging: boolean;
  dragStartPos: { x: number; y: number };
  startPos: { left: number; top: number };
  boundMouseMove: (event: MouseEvent) => void;
  boundMouseUp: (event: MouseEvent) => void;
}

export interface DragCallbacks {
  onDragStart?: (uuid: string) => void;
  onDragMove?: (uuid: string) => void;
  onDragEnd?: (uuid: string, newPosition: FlowPosition) => void;
}

/**
 * Snaps a coordinate value to the nearest 20px grid position
 */
export function snapToGrid(value: number): number {
  return Math.round(value / 20) * 20;
}

export function createDragHandler(
  uuid: string,
  getCurrentPosition: () => FlowPosition,
  updatePosition: (uuid: string, position: FlowPosition) => void,
  callbacks?: DragCallbacks
): DragState & { handleMouseDown: (event: MouseEvent) => void } {
  const dragState: DragState = {
    isDragging: false,
    dragStartPos: { x: 0, y: 0 },
    startPos: { left: 0, top: 0 },
    boundMouseMove: () => {},
    boundMouseUp: () => {}
  };

  const handleMouseDown = (event: MouseEvent): void => {
    // Only start dragging if clicking on the element itself, not on interactive sub-elements
    const target = event.target as HTMLElement;
    if (target.classList.contains('exit') || target.closest('.exit')) {
      return;
    }

    dragState.isDragging = true;
    dragState.dragStartPos = { x: event.clientX, y: event.clientY };
    const currentPos = getCurrentPosition();
    dragState.startPos = {
      left: currentPos.left,
      top: currentPos.top
    };

    callbacks?.onDragStart?.(uuid);

    event.preventDefault();
    event.stopPropagation();
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (!dragState.isDragging) return;

    const deltaX = event.clientX - dragState.dragStartPos.x;
    const deltaY = event.clientY - dragState.dragStartPos.y;

    const newLeft = dragState.startPos.left + deltaX;
    const newTop = dragState.startPos.top + deltaY;

    callbacks?.onDragMove?.(uuid);

    // Update visual position during drag
    const element = document.querySelector(`[data-uuid="${uuid}"]`) as HTMLElement;
    if (element) {
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }
  };

  const handleMouseUp = (event: MouseEvent): void => {
    if (!dragState.isDragging) return;

    dragState.isDragging = false;

    const deltaX = event.clientX - dragState.dragStartPos.x;
    const deltaY = event.clientY - dragState.dragStartPos.y;

    const newLeft = dragState.startPos.left + deltaX;
    const newTop = dragState.startPos.top + deltaY;

    // Snap to 20px grid for final position
    const snappedLeft = snapToGrid(newLeft);
    const snappedTop = snapToGrid(newTop);

    const newPosition = { left: snappedLeft, top: snappedTop };
    updatePosition(uuid, newPosition);

    callbacks?.onDragEnd?.(uuid, newPosition);
  };

  // Bind event handlers
  dragState.boundMouseMove = handleMouseMove;
  dragState.boundMouseUp = handleMouseUp;

  return {
    ...dragState,
    handleMouseDown
  };
}

export function addDragEventListeners(
  element: HTMLElement,
  dragHandler: DragState & { handleMouseDown: (event: MouseEvent) => void }
): void {
  element.addEventListener('mousedown', dragHandler.handleMouseDown);
  document.addEventListener('mousemove', dragHandler.boundMouseMove);
  document.addEventListener('mouseup', dragHandler.boundMouseUp);
}

export function removeDragEventListeners(
  dragHandler: DragState
): void {
  document.removeEventListener('mousemove', dragHandler.boundMouseMove);
  document.removeEventListener('mouseup', dragHandler.boundMouseUp);
}