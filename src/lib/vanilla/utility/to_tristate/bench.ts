/* Imports */
import { test } from 'vitest'
import { to_tristate as imported_to_tristate } from './index.js'

// Capture the export once to keep Vite module getters out of the timed loop.
const to_tristate = imported_to_tristate

/* Benchmark */
test('to_tristate', async ({ bench }) => {
	await bench('to_tristate', () => to_tristate(false)).run()
})
