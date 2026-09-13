/* Imports */
import { test, describe } from 'vitest'
import { clamp as imported_clamp } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const clamp = imported_clamp

/* Benchmark */
// Short sampling windows limit overhead from collecting very fast operations.
describe('clamp', () => {
	for (const [name, value] of [
		['below range', -10],
		['within range', 50],
		['above range', 110]
	] as const) {
		test(name, async ({ bench }) => {
			await bench(name, () => clamp(value, 0, 100)).run({ time: 100, warmupTime: 50 })
		})
	}
})
