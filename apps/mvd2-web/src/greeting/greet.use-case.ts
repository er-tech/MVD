import type { Greeting } from './greeting.contract.ts'

/**
 * Greets someone by name.
 * @param name - who to greet
 * @returns the greeting
 */
export function greet (name: string): Greeting {
  return { message: `Hello, ${name}!` }
}
