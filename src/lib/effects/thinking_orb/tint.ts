import type { OrbTint } from './engine/core.js'

/**
 * Parse a CSS color into an RGB triple for the tinted ink painter.
 * Supports #rgb, #rrggbb and rgb()/rgba(); anything else -> no tint.
 */
export function parseTint(color: string | undefined): OrbTint | undefined {
	if (!color) return undefined
	const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
	if (hex) {
		let h = hex[1]
		if (h.length === 3) h = h.replace(/./g, c => c + c)
		const n = parseInt(h, 16)
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
	}
	const fn = color.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
	if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) }
	return undefined
}

/** Default per-state `aria-label`s. */
export const LABELS: Record<string, string> = {
	working: 'Working…',
	searching: 'Searching…',
	solving: 'Solving…',
	listening: 'Listening…',
	connecting: 'Connecting…',
	weaving: 'Weaving…',
	composing: 'Composing…',
	breathing: 'Thinking…',
	shaping: 'Shaping…'
}
