// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

interface ScrollElementWithinContainerOptions {
  behavior: 'auto' | 'instant' | 'smooth';
  block: 'nearest' | 'start';
  /** Space kept below the element when checking whether it is visible. */
  inset?: number;
  /** Space kept above the element, including any sticky toolbar. */
  topInset?: number;
}

/**
 * Scrolls one explicit pane without allowing `scrollIntoView` to move the
 * document or a sibling editor pane.
 */
export function scrollElementWithinContainer(
  container: HTMLElement,
  element: HTMLElement,
  { behavior, block, inset = 16, topInset = inset }: ScrollElementWithinContainerOptions
): void {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const visibleTop = containerRect.top + topInset;
  const visibleBottom = containerRect.bottom - inset;
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  let delta = 0;
  if (block === 'start' || elementRect.height > visibleHeight) {
    delta = elementRect.top - visibleTop;
  } else if (elementRect.top < visibleTop) {
    delta = elementRect.top - visibleTop;
  } else if (elementRect.bottom > visibleBottom) {
    delta = elementRect.bottom - visibleBottom;
  } else {
    return;
  }

  container.scrollTo({
    top: Math.max(0, container.scrollTop + delta),
    behavior,
  });
}
