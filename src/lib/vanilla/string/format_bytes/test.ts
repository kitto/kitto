import { describe, it, expect } from 'vitest'
import { format_bytes } from './index.js'

describe('format_bytes', () => {
	it.each([
		[0, '0B'],
		[1, '1B'],
		[999, '999B'],
		[1000, '1KB'],
		[1000000, '1MB'],
		[1000000000, '1GB'],
		[1000000000000, '1TB'],
		[1000000000000000, '1000TB']
	])('formats %s bytes as %s using decimal units capped at TB', (bytes, expected) => {
		expect(format_bytes(bytes)).toBe(expected)
	})

	it.each([
		[0.1, '1B'],
		[350889, '351KB'],
		[351000, '351KB'],
		[351001, '352KB'],
		[1000001, '2MB'],
		[1000000001, '2GB'],
		[1000000000001, '2TB'],
		[999999, '1000KB'],
		[999999999, '1000MB'],
		[999999999999, '1000GB']
	])('rounds %s bytes up to %s in the selected unit', (bytes, expected) => {
		expect(format_bytes(bytes)).toBe(expected)
	})

	it.each([-1, NaN, Infinity, -Infinity])('rejects invalid byte count %s', bytes => {
		expect(() => format_bytes(bytes)).toThrow(RangeError)
	})
})
