/** True for an element the person types in, which keeps its own copy, paste and delete keys. */
export function isField (target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null)
}
