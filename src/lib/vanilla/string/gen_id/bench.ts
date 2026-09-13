/* Imports */
import { test, describe, expect, vi } from 'vitest'
import { gen_id as imported_gen_id } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const gen_id = imported_gen_id
const uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/* Benchmark */
// Short sampling windows limit overhead from collecting very fast operations.
describe('gen_id', () => {
	test('native randomUUID', async ({ bench }) => {
		expect(typeof crypto.randomUUID).toBe('function')
		expect(gen_id()).toMatch(uuid_v4)
		await bench('native randomUUID', () => gen_id()).run({ time: 100, warmupTime: 50 })
	})

	test('getRandomValues fallback', async ({ bench, onTestFinished }) => {
		// Disable only randomUUID, keeping the real cryptographic random source.
		const getRandomValues = crypto.getRandomValues.bind(crypto)
		onTestFinished(() => {
			vi.unstubAllGlobals()
		})
		vi.stubGlobal('crypto', { getRandomValues })
		expect(gen_id()).toMatch(uuid_v4)
		await bench('getRandomValues fallback', () => gen_id()).run({ time: 100, warmupTime: 50 })
	})
})
