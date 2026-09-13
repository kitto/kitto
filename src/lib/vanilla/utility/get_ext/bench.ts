/* Imports */
import { test, describe } from 'vitest'
import { get_ext as imported_get_ext } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const get_ext = imported_get_ext

/* Benchmark */
describe('get_ext', () => {
	test('extension with query and fragment', async ({ bench }) => {
		await bench('extension with query and fragment', () => {
			return get_ext('https://example.com/report.pdf?size=large#top')
		}).run()
	})

	test('no extension', async ({ bench }) => {
		await bench('no extension', () => {
			return get_ext('https://example.com/files/readme')
		}).run()
	})

	test('hidden file', async ({ bench }) => {
		await bench('hidden file', () => {
			return get_ext('https://example.com/.hiddenfile')
		}).run()
	})

	test('invalid URL', async ({ bench }) => {
		await bench('invalid URL', () => {
			return get_ext('invalid-url')
		}).run()
	})
})
