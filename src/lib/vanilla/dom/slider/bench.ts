/* Imports */
import { afterAll, expect, test } from 'vitest'
import { slider as imported_slider } from './index.js'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const slider = imported_slider
function build(count: number) {
	const el = document.createElement('div')

	for (let i = 0; i < count; i++) el.append(document.createElement('div'))
	document.body.append(el)

	return el
}

const small = build(5)
const large = build(50)
const looped = build(50)
const navigation = build(50)

afterAll(() => {
	for (const el of [small, large, looped, navigation]) el.remove()
})

/* Benchmark */
test('slider init (5 slides)', async ({ bench }) => {
	await bench('slider init (5 slides)', () => {
		slider(small).destroy()
	}).run()
})

test('slider init (50 slides)', async ({ bench }) => {
	await bench('slider init (50 slides)', () => {
		slider(large).destroy()
	}).run()
})

test('slider init (50 slides, looping)', async ({ bench }) => {
	await bench('slider init (50 slides, looping)', () => {
		slider(looped, { loop: true, per_page: 3 }).destroy()
	}).run()
})

test('slider next', async ({ bench, onTestFinished }) => {
	const reel = slider(navigation, { duration: 0 })
	onTestFinished(() => reel.destroy())
	reel.next()
	expect(reel.index).toBe(1)

	await bench('slider next', { beforeEach: () => reel.go_to(0) }, () => {
		reel.next()
	}).run()
	expect(reel.index).toBe(1)
})
