/* Imports */
import { expect, test } from 'vitest'
import { format_date as imported_format_date } from './index.js'
import tinydate from 'tinydate'

/* Setup */
// Capture the export once to keep Vite module getters out of the timed loop.
const format_date = imported_format_date
const str = '{YY} {MM} {DD} @ {HH}:{mm}:{ss}'
const date = new Date(2026, 0, 2, 3, 4, 5)
const tiny_format = tinydate(str)

/* Benchmark */
test('compare format_date & tinydate', async ({ bench }) => {
	// Warm both formatters and verify they perform the same work before timing them.
	expect(format_date(str, date)).toBe(tiny_format(date))

	await bench.compare(
		bench('format_date', () => format_date(str, date)),
		bench('tinydate', () => tiny_format(date))
	)
})
