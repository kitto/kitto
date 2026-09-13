/* Imports */
import { test } from 'vitest'
import { format_elapse as imported_format_elapse } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const format_elapse = imported_format_elapse
const date = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

/* Benchmark */
test('format_elapse', async ({ bench }) => {
	await bench('format_elapse', () => {
		format_elapse(date)
	}).run()
})
