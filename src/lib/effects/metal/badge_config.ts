/**
 * "New" badge metrics — Figma: Portfolio › tab 3 (1458:40880), applied verbatim.
 *
 *   45×25, pill r 55.556. Layers bottom→top:
 *     1. white fill
 *     2. metal texture (a static PNG in Figma — here the live shader, via a
 *        full-pill mask so it covers the fill)
 *     3. gradient rgba(255,255,255,.6) → 0, top→bottom
 *     3b. clean white core under the label — radial ellipse 46%, solid to
 *        `core`, ramp over `coreBlur`, so the text sits on white and metal
 *        creeps in at the rim
 *     4. text: Inter Semi Bold 12.222/1.4 #323232, box 26.667×13.333
 *     5. inset shadows: 0 0 8.333 #fff ×2, 0 0 0 0.833 rgba(255,255,255,.5),
 *        0 0.833 0 rgba(255,255,255,.78)
 */
export const BADGE_RADIUS = 55.556
export const BADGE_W = 45
export const BADGE_H = 25
export const BADGE_TEXT_W = 26.667
export const BADGE_TEXT_H = 13.333
export const BADGE_PAD_X = (BADGE_W - BADGE_TEXT_W) / 2

/** `glow` scales the two soft inner glows; the hairline rims stay as designed. */
export const badgeShadow = (k: number, glow: number): string =>
	`inset 0px 0px ${8.333 * k}px 0px rgba(255,255,255,${glow}), ` +
	`inset 0px 0px ${8.333 * k}px 0px rgba(255,255,255,${glow}), ` +
	`inset 0px 0px 0px ${0.833 * k}px rgba(255,255,255,0.5), ` +
	`inset 0px ${0.833 * k}px 0px 0px rgba(255,255,255,0.78)`

/** White core under the label: solid radius (% of ellipse), ramp width, opacity, ellipse size (% of box). */
export interface MetalBadgeCore {
	r: number
	blur: number
	a: number
	size: number
}

/** Tuned on the demo's "Live mode · New" card. */
export const METAL_BADGE_DEFAULTS = Object.freeze({
	metalOpacity: 0.8,
	shaderScale: 1.6,
	/** White core under the label: solid radius (% of ellipse), ramp width, opacity, ellipse size (% of box). */
	core: Object.freeze({ r: 46, blur: 100, a: 0.94, size: 49 }) as Readonly<MetalBadgeCore>,
	gradient: 0,
	glow: 0.41
})
