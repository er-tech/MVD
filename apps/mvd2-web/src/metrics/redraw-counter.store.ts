let draws = 0

/** Count one row drawn. A row calls this after each time it is drawn. */
export function countRowDraw (): void {
  draws++
}

/**
 * Read and reset the count.
 *
 * @returns how many rows were drawn since the last call.
 */
export function takeRowDraws (): number {
  const taken = draws
  draws = 0

  return taken
}
