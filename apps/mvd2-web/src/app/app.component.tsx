import { greet } from '../greeting'

/** The app's root component. */
export function App () {
  return <h1>{greet('world').message}</h1>
}
