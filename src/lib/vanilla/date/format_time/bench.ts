/* Imports */
import { test } from 'vitest'
import { format_time as imported_format_time } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const format_time = imported_format_time
const mins = 90

/* Benchmark */
test('format_time', async ({ bench }) => {
	await bench('format_time', () => {
		format_time(mins)
	}).run()
})
