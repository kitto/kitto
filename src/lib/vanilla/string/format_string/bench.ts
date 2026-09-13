/* Imports */
import { test, describe } from 'vitest'
import { format_string as imported_format_string } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const format_string = imported_format_string
const sentence =
	"constantly seek criticism.\fa WELL THOUGHT out critique\nof what you're doing is\nas valuable as gold"
const title = 'elon musk'
const slug = 'Hello_World! This is a Test@String#123'

/* Benchmark */
describe('format_string', () => {
	test('sentence', async ({ bench }) => {
		await bench('sentence', () => {
			format_string(sentence, 'sentence')
		}).run()
	})
	test('title', async ({ bench }) => {
		await bench('title', () => {
			format_string(title, 'title')
		}).run()
	})
	test('slug', async ({ bench }) => {
		await bench('slug', () => {
			format_string(slug, 'slug')
		}).run()
	})
})
