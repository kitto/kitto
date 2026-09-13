/* Imports */
import { test, describe } from 'vitest'
import { query as imported_query } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const query = imported_query
const data = { one: 1, two: 'he.*g', three: ['a', 'b'] }
const str = 'one=1&two=he.*g&three=a&three=b'

/* Benchmark */
describe('query', () => {
	test('encode', async ({ bench }) => {
		await bench('encode', () => {
			query(data, '?')
		}).run()
	})
	test('decode', async ({ bench }) => {
		await bench('decode', () => {
			query(str)
		}).run()
	})
})
