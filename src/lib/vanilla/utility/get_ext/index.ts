/**
 * @module get_ext
 * @group Vanilla
 * @version 1.0.1
 * @remarks Reads the final filename in the URL pathname, ignoring query strings
 * and fragments. Returns the suffix after the last dot, preserving its case and
 * encoding. A leading dot alone does not count as an extension; a trailing dot
 * returns an empty string.
 *
 * @param url - An absolute URL to inspect.
 * @returns The extension without its dot, or null for an invalid URL or a
 * filename without an extension.
 *
 * @example
 * get_ext('https://example.com/report.pdf?size=large#top') // 'pdf'
 * get_ext('https://example.com/.hiddenfile') // null
 * get_ext('invalid-url') // null
 */
export function get_ext(url: string): string | null {
	try {
		const pathname = new URL(url).pathname
		const filename = pathname.slice(pathname.lastIndexOf('/') + 1)
		const dot = filename.lastIndexOf('.')

		return dot > 0 ? filename.slice(dot + 1) : null
	} catch {
		return null
	}
}
