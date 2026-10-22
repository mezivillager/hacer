import { ensureReference } from './reference'

export default function setup(): void {
  ensureReference((line) => console.log(line))
}
