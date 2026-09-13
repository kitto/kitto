/* Imports */
import { test, describe } from 'vitest'
import { format_bytes as imported_format_bytes } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const format_bytes = imported_format_bytes

/* Benchmark */
// Short sampling windows limit overhead from collecting very fast operations.
describe('format_bytes', () => {
	for (const bytes of [0, 999, 1000, 999999, 1000000, 1000000000000000]) {
		test(`${bytes} bytes`, async ({ bench }) => {
			await bench(`${bytes} bytes`, () => format_bytes(bytes)).run({ time: 100, warmupTime: 50 })
		})
	}
})
