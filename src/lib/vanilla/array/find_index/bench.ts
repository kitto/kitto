/* Imports */
import { test } from 'vitest'
import { find_index as imported_find_index } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const find_index = imported_find_index
const arr = [
	{ testA: 1, testB: 2 },
	{ testA: 3, testB: 4 }
]

/* Benchmark */
test('find_index', async ({ bench }) => {
	await bench('find_index', () => {
		find_index(arr, 'testA', 1)
	}).run()
})
