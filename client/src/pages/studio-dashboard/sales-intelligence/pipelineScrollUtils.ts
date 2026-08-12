import type { WheelEvent as ReactWheelEvent } from "react";

const SCROLL_EPSILON = 1;

export function canScrollVertically(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight + SCROLL_EPSILON;
}

export function canScrollHorizontally(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth + SCROLL_EPSILON;
}

/** True when the gesture is primarily vertical (mouse wheel / trackpad). */
export function isVerticalWheelIntent(event: Pick<WheelEvent, "deltaX" | "deltaY" | "shiftKey">): boolean {
  if (event.shiftKey) return false;
  return Math.abs(event.deltaY) >= Math.abs(event.deltaX);
}

/** True when the gesture is primarily horizontal (trackpad swipe / shift+wheel). */
export function isHorizontalWheelIntent(event: Pick<WheelEvent, "deltaX" | "deltaY" | "shiftKey">): boolean {
  if (event.shiftKey && Math.abs(event.deltaY) > 0) return true;
  return Math.abs(event.deltaX) > Math.abs(event.deltaY);
}

/**
 * Scroll a nested vertical container; at scroll boundaries, let the page scroll.
 * Returns true when the event was consumed.
 */
export function chainVerticalWheelToScroller(
  event: ReactWheelEvent<HTMLElement>,
  scroller: HTMLElement | null
): boolean {
  if (!scroller || !isVerticalWheelIntent(event)) return false;
  if (!canScrollVertically(scroller)) return false;

  const { deltaY } = event;
  const { scrollTop, scrollHeight, clientHeight } = scroller;
  const atTop = scrollTop <= SCROLL_EPSILON;
  const atBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_EPSILON;

  if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
    return false;
  }

  scroller.scrollTop += deltaY;
  event.preventDefault();
  return true;
}

/**
 * Scroll a horizontal strip inside a card; at boundaries, allow parent/page scroll.
 * Returns true when the event was consumed.
 */
export function handleHorizontalStripWheel(event: ReactWheelEvent<HTMLElement>): boolean {
  const element = event.currentTarget;
  if (!isHorizontalWheelIntent(event)) return false;
  if (!canScrollHorizontally(element)) return false;

  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
  if (delta === 0) return false;

  const { scrollLeft, scrollWidth, clientWidth } = element;
  const atLeft = scrollLeft <= SCROLL_EPSILON;
  const atRight = scrollLeft + clientWidth >= scrollWidth - SCROLL_EPSILON;

  if ((delta < 0 && atLeft) || (delta > 0 && atRight)) {
    return false;
  }

  element.scrollLeft += delta;
  event.preventDefault();
  event.stopPropagation();
  return true;
}

/** Chain vertical wheel from a card to its pipeline column. */
export function handlePipelineCardWheel(event: ReactWheelEvent<HTMLElement>): void {
  const column = event.currentTarget.closest("[data-pipeline-column]");
  if (!(column instanceof HTMLElement)) return;

  chainVerticalWheelToScroller(event, column);
}

/** Chain vertical wheel on the column shell (padding, gaps, empty state). */
export function handlePipelineColumnWheel(event: ReactWheelEvent<HTMLElement>): void {
  chainVerticalWheelToScroller(event, event.currentTarget);
}

/** Horizontal wheel on the kanban board row — do not block page vertical scroll. */
export function handlePipelineBoardWheel(event: ReactWheelEvent<HTMLElement>): void {
  if (!isHorizontalWheelIntent(event)) return;

  const board = event.currentTarget;
  if (!canScrollHorizontally(board)) return;

  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
  if (delta === 0) return;

  const { scrollLeft, scrollWidth, clientWidth } = board;
  const atLeft = scrollLeft <= SCROLL_EPSILON;
  const atRight = scrollLeft + clientWidth >= scrollWidth - SCROLL_EPSILON;

  if ((delta < 0 && atLeft) || (delta > 0 && atRight)) {
    return;
  }

  board.scrollLeft += delta;
  event.preventDefault();
}
