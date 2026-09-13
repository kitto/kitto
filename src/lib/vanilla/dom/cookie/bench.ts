/* Imports */
import { expect, test } from 'vitest'
import { cookie } from './index.js'

/* Benchmark */
test('cookie', async ({ bench, onTestFinished }) => {
	cookie.set('test', 1)
	onTestFinished(() => cookie.remove('test'))
	expect(cookie.get('test')).toBe('1')
	const get_cookie = cookie.get

	await bench('cookie', () => {
		get_cookie('test')
	}).run()
})
