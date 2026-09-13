/* Imports */
import { test } from 'vitest'
import { throttle } from './index.js'

/* Setup */
const fn = () => {}
const throttled_fn = throttle(fn, 1000)

/* Benchmark */
test('throttle', async ({ bench }) => {
	await bench('throttle', () => {
		throttled_fn()
	}).run()
})
