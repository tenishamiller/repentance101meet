/** Eat the leftover click after Chrome/Safari closes the screen-share picker. */
export function swallowStraySharePickerClick(ms = 1500) {
  if (typeof document === "undefined") return () => undefined;

  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  document.addEventListener("pointerdown", swallow, true);
  document.addEventListener("pointerup", swallow, true);
  document.addEventListener("click", swallow, true);

  const timer = window.setTimeout(() => {
    document.removeEventListener("pointerdown", swallow, true);
    document.removeEventListener("pointerup", swallow, true);
    document.removeEventListener("click", swallow, true);
  }, ms);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("pointerdown", swallow, true);
    document.removeEventListener("pointerup", swallow, true);
    document.removeEventListener("click", swallow, true);
  };
}
