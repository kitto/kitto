/* Imports */
import { test, describe, expect } from 'vitest'
import { to_base64 as imported_to_base64 } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const to_base64 = imported_to_base64

/* Benchmark */
// Uses jsdom's FileReader; browser throughput should be measured in a browser.
describe('to_base64', () => {
	for (const size of [1024, 65536, 1048576]) {
		test(`${size} bytes`, async ({ bench }) => {
			// Allocate the input outside the timed loop and await every conversion.
			const file = new Blob([new Uint8Array(size)], { type: 'application/octet-stream' })
			const result = await to_base64(file)
			const prefix = 'data:application/octet-stream;base64,'
			expect(result).toMatch(/^data:application\/octet-stream;base64,/)
			expect(result).toHaveLength(prefix.length + Math.ceil(size / 3) * 4)
			await bench(`${size} bytes`, () => to_base64(file)).run()
		})
	}
})
