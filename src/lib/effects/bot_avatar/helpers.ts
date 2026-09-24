/* The component's small helpers, lifted out of BotAvatar.tsx so they can be tested. */

/** A 0–1 seed from the instance id, so two avatars side by side never blink
   in step unless asked to. */
export function hashSeed(id: string): number {
	let h = 2166136261
	for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
	return ((h >>> 0) % 1000) / 1000
}

/** Clamp to a range; a non-finite value falls back to 1 (as upstream). */
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 1))

const pathCache = new Map<string, Path2D>()
export function bodyPath(d: string): Path2D {
	let p = pathCache.get(d)
	if (!p) {
		p = new Path2D(d)
		pathCache.set(d, p)
	}
	return p
}

export const reducedMotion = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
