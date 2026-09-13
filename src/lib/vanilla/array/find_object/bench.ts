/* Imports */
import { test } from 'vitest'
import { find_object as imported_find_object } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const find_object = imported_find_object
const arr = [
	{ testA: 1, testB: 2 },
	{
		testA: 3,
		testB: {
			testC: 4,
			testD: [{ testE: 5 }, { testE: 6 }]
		}
	}
]

/* Benchmark */
test('find_object', async ({ bench }) => {
	await bench('find_object', () => {
		find_object(arr, 'testA', 1)
	}).run()
})
test('find_object recursive', async ({ bench }) => {
	await bench('find_object recursive', () => {
		find_object(arr, 'testC', 4, true)
	}).run()
})
test('find_object deep recursive', async ({ bench }) => {
	await bench('find_object deep recursive', () => {
		find_object(arr, 'testE', 6, true)
	}).run()
})
