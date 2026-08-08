export function isNearBottom(element: HTMLElement, threshold = 80) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

export function scrollContainerToBottom(
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  element.scrollTo({ top: element.scrollHeight, behavior });
}
