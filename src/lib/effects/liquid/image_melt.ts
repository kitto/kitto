/** Image melt (the v2 "melt lab" effect, engine-free): two image-filled
 *  cards whose surfaces run molten where they touch — colours averaged
 *  through the goo, the crisp faces dissolving at the seam, and a marbling
 *  pass folding the two palettes into streaks in the touch area.
 *
 *  Architecture: the participating items' DOM stays interactive but paints
 *  nothing (opacity 0); an SVG layer in the group re-renders their imagery
 *  as pattern-filled rounded rects through the melt's filter stack,
 *  following the live rects each frame. Pairwise by design — the first two
 *  melt items in a group form the pair; the seam maths is two-body. */

export interface ImageMeltOptions {
	/** Goo sigma: how far the bodies reach for each other AND how wide the
	 *  colour averaging runs. Default 7. */
	blur?: number
	/** Alpha-contrast slope of the liquid boundary. Default 40. */
	contrast?: number
	/** How far each crisp face dissolves back before the neighbour, as a
	 *  factor of the half-diagonal. Default 0.8. */
	reach?: number
	/** Softness of that dissolve (mask blur sigma). Default 17. */
	fade?: number
	/** Turbulence displacement of the molten layer, px. Default 0. */
	warp?: number
	/** 0..1 two-liquid marbling strength in the touch area. Default 1. */
	mix?: number
	/** Blur of the marble pass's source colours. Default 8. */
	mixBlur?: number
	/** How deep the marble zone reaches into each card. Default 1.9. */
	gravity?: number
	/** Wavelength control of the warp noise. Default 12. */
	waviness?: number
}

export const IMAGE_MELT_DEFAULTS: Required<ImageMeltOptions> = {
	blur: 7,
	contrast: 40,
	reach: 0.8,
	fade: 17,
	warp: 0,
	mix: 1,
	mixBlur: 8,
	gravity: 1.9,
	waviness: 12
}

export interface ImageMeltEntry {
	el: HTMLElement
	src: string
	opts: Required<ImageMeltOptions>
}

/** Registry lives on the Gooey group via context. */
export interface ImageMeltRegistry {
	register(entry: ImageMeltEntry): () => void
	subscribe(fn: () => void): () => void
	entries(): ImageMeltEntry[]
}

export function createImageMeltRegistry(): ImageMeltRegistry {
	const set = new Set<ImageMeltEntry>()
	const subs = new Set<() => void>()
	const notify = () => subs.forEach(f => f())
	return {
		register(entry) {
			set.add(entry)
			notify()
			return () => {
				set.delete(entry)
				notify()
			}
		},
		subscribe(fn) {
			subs.add(fn)
			return () => subs.delete(fn)
		},
		entries: () => [...set]
	}
}

export interface CardGeom {
	x: number
	y: number
	w: number
	h: number
	r: number
}

export function readGeom(group: HTMLElement, el: HTMLElement): CardGeom {
	const gr = group.getBoundingClientRect()
	const r = el.getBoundingClientRect()
	const cs = getComputedStyle(el)
	const rad = parseFloat(cs.borderTopLeftRadius) || 0
	return {
		x: r.left - gr.left,
		y: r.top - gr.top,
		w: r.width,
		h: r.height,
		r: Math.min(rad, r.width / 2, r.height / 2)
	}
}

export const geomKey = (g: CardGeom) =>
	`${Math.round(g.x * 2)},${Math.round(g.y * 2)},${Math.round(g.w)},${Math.round(g.h)},${Math.round(g.r)}`

/** Smoothstepped proximity target of a pair: 1 when touching, 0 once the gap
 *  exceeds the goo reach. */
export function meltProximity(a: CardGeom, b: CardGeom, gooBlur: number): number {
	const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
	const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
	const gap = Math.max(
		0,
		Math.hypot(
			Math.max(Math.abs(ca.x - cb.x) - (a.w + b.w) / 2, 0),
			Math.max(Math.abs(ca.y - cb.y) - (a.h + b.h) / 2, 0)
		)
	)
	const near = Math.max(0, Math.min(1, 1 - gap / Math.max(8, gooBlur * 2.6)))
	return near * near * (3 - 2 * near)
}

/** Every derived value the melt SVG for one pair needs — a pure function of
 *  the two geometries, the tuning and the eased proximity. */
export function meltPairGeometry(a: CardGeom, b: CardGeom, opts: Required<ImageMeltOptions>, prox: number) {
	const { blur: gooBlur, contrast, reach, warp, mix } = opts
	const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
	const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
	const intercept = Math.round((0.5 - contrast * (5 / 12)) * 100) / 100
	const rA = (Math.hypot(a.w, a.h) / 2) * reach * prox
	const rB = (Math.hypot(b.w, b.h) / 2) * reach * prox
	const seam = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 }
	const dxc = cb.x - ca.x
	const dyc = cb.y - ca.y
	const dc = Math.max(1e-3, Math.hypot(dxc, dyc))
	const tx = -dyc / dc
	const ty = dxc / dc
	const ovx = Math.max(0, (a.w + b.w) / 2 - Math.abs(dxc))
	const ovy = Math.max(0, (a.h + b.h) / 2 - Math.abs(dyc))
	const tanHalf = 0.5 * (ovx * Math.abs(tx) + ovy * Math.abs(ty)) * prox
	const seamDeg = Math.round((Math.atan2(ty, tx) * 180) / Math.PI)
	const mixAmt = Math.round(mix * prox * 100) / 100
	const blurEff = Math.round((2 + (gooBlur - 2) * prox) * 10) / 10
	const warpEff = Math.round(warp * prox * 10) / 10
	const colorBlur = Math.round(blurEff * 2.5 * 10) / 10
	const edgeSoft = Math.round((0.4 + (2 + gooBlur * 0.8) * prox) * 10) / 10
	return { intercept, rA, rB, seam, tanHalf, seamDeg, mixAmt, blurEff, warpEff, colorBlur, edgeSoft }
}
