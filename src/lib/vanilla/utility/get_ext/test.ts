import { describe, it, expect } from 'vitest'
import { get_ext } from './index.js'

describe('get_ext', () => {
	it.each([
		['https://example.com/report.pdf?size=large#top', '.pdf'],
		['https://sub.domain.co.uk/file.txt', '.txt'],
		['https://example.com/archive.tar.gz', '.gz'],
		['https://example.com/PHOTO.JPG', '.JPG'],
		['https://example.com/.hiddenfile.txt', '.txt'],
		['https://example.com/file.', '.'],
		['https://example.com/my%20report.pdf', '.pdf'],
		['https://example.com/file.t%78t', '.t%78t'],
		['file:///files/report.pdf', '.pdf']
	])('extracts the extension from %s', (url, expected) => {
		expect(get_ext(url)).toBe(expected)
	})

	it.each([
		'https://example.com/.hiddenfile',
		'https://example.com',
		'https://example.com/files/',
		'https://example.com/folder.pdf/',
		'https://example.com/folder.pdf/readme',
		'https://example.com/readme?file=report.pdf#file.txt',
		'https://example.com/file%2Etxt',
		'invalid-url',
		'/files/report.pdf',
		'//example.com/report.pdf',
		''
	])('returns null for %s', url => {
		expect(get_ext(url)).toBeNull()
	})
})
