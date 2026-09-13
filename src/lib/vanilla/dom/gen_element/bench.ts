/* Imports */
import { test, describe } from 'vitest'
import { gen_element as imported_gen_element } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const gen_element = imported_gen_element
const attributes = { id: 'example', class: 'card', 'data-state': 'active', textContent: 'Hello' }
const handler = () => {}
const events = { onclick: handler, onfocus: handler, onblur: handler }

/* Benchmark */
// Elements remain detached so iterations do not accumulate nodes in the document.
// These measure jsdom creation, not browser layout or painting.
describe('gen_element', () => {
	test('empty element', async ({ bench }) => {
		await bench('empty element', () => gen_element('div')).run()
	})

	test('attributes and properties', async ({ bench }) => {
		await bench('attributes and properties', () => gen_element('div', attributes)).run()
	})

	test('event listeners', async ({ bench }) => {
		await bench('event listeners', () => gen_element('button', events)).run()
	})
})
