/* Imports */
import { test, describe, expect } from 'vitest'
import { latch as imported_latch, type Jar, type LatchSpec } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const latch = imported_latch

/* Benchmark */
// Short sampling windows limit overhead from collecting very fast operations.
describe('latch', () => {
	for (const count of [1, 10, 100]) {
		for (const mode of ['read', 'write', 'clear'] as const) {
			const name = `${mode} ${count} keys`
			test(name, async ({ bench }) => {
				const keys = Array.from({ length: count }, (_, i) => `key${i}`)
				const specs: Record<string, LatchSpec> = Object.fromEntries(keys.map(key => [key, true]))
				const store = new Map<string, string>()
				const jar: Jar = {
					get: key => store.get(key),
					set: (key, value) => {
						store.set(key, value)
					},
					delete: key => {
						store.delete(key)
					}
				}
				const url = new URL('https://example.com/')
				if (mode !== 'read') {
					for (const key of keys) url.searchParams.set(key, mode === 'write' ? 'new' : '')
				}
				const options = { jar, url }
				const reset = () => {
					store.clear()
					if (mode !== 'write') {
						for (const key of keys) store.set(key, 'stored')
					}
				}

				reset()
				expect(latch(specs, options)).toEqual(
					Object.fromEntries(
						keys.map(key => [key, mode === 'read' ? 'stored' : mode === 'write' ? 'new' : undefined])
					)
				)
				// Reset outside each timed call so writes and clears never become reads.
				await bench(name, { beforeEach: reset }, () => latch(specs, options)).run({
					time: 100,
					warmupTime: 50
				})
				expect(store.size).toBe(mode === 'clear' ? 0 : count)
			})
		}
	}
})
