/* Imports */
import { test, describe } from 'vitest'
import { sleep as imported_sleep } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const sleep = imported_sleep
const callback = () => {}

/* Benchmark */
// Await real timers: these measure timer scheduling and the requested delay too.
describe('sleep', () => {
	test('zero delay', async ({ bench }) => {
		await bench('zero delay', () => sleep(0)).run()
	})

	test('zero delay with callback', async ({ bench }) => {
		await bench('zero delay with callback', () => sleep(0, callback)).run()
	})

	test('1ms delay', async ({ bench }) => {
		await bench('1ms delay', () => sleep(1)).run()
	})
})
