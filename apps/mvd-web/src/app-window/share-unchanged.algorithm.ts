const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Gives back `next` with every part that is equal to the same part of `previous` replaced by
 * the one in `previous`, so a component that gets that part again sees the same object and
 * React can leave it alone. Parts are compared by position in a list and by name in an object.
 *
 * @param previous What was received before; anything.
 * @param next What was received now, as just parsed.
 * @returns `previous` itself when nothing changed, else `next` sharing what did not change.
 */
export function shareUnchanged<T> (previous: unknown, next: T): T {
  if (previous === next) return next

  if (Array.isArray(next)) {
    if (!Array.isArray(previous)) return next
    const items = next.map((item, index) => shareUnchanged(previous[index], item))

    return (items.length === previous.length && items.every((item, index) => item === previous[index]) ? previous : items) as T
  }

  if (isRecord(next)) {
    if (!isRecord(previous)) return next
    const keys = Object.keys(next)
    const shared: Record<string, unknown> = {}
    for (const key of keys) shared[key] = shareUnchanged(previous[key], next[key])

    return (keys.length === Object.keys(previous).length && keys.every(key => shared[key] === previous[key]) ? previous : shared) as T
  }

  return next
}
