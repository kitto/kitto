import type { ShadowLayer } from './shadow.js'

/** Alpha-binarize matrix used before spread dilation: the goo alpha has a soft
 *  fringe past the opaque edge — dilating it directly pushes a spread ring a
 *  pixel out and the fringe reads as a second hairline. */
export const BINARIZE = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -29.5'

/** Alpha-contrast intercept for a slope: tracks the slope so the alpha
 *  threshold stays near the same crossing as the classic 18/-7 goo pairing. */
export function gooIntercept(contrast: number): number {
	return Math.round((0.5 - contrast * (5 / 12)) * 100) / 100
}

/** How the group splits a parsed shadow stack. The filter raster is the whole
 *  performance story on WebKit, which runs SVG filters on the CPU at full
 *  device scale. The heavy layers are the BLURRED outer shadows; CSS
 *  drop-shadow() is mathematically the same operation (blur-radius = 2σ,
 *  exactly box-shadow's convention) but runs on the compositor. So:
 *    - blurred/offset outer shadows  -> drop-shadow() on the svg element
 *    - spread rings and inset layers -> SVG passes (cheap morphology/offset ops)
 *    - the goo chain itself          -> SVG
 *  The filter pad also shrinks to what the REMAINING svg layers reach. */
export function splitShadows(shadows: ShadowLayer[], blur: number, filterPadding: number) {
	const svgShadows = shadows.filter(s => s.inset || s.spread !== 0)
	const cssShadowFilter = shadows
		.filter(s => !s.inset && s.spread === 0)
		// box-shadow lists paint the FIRST layer on top; drop-shadow chains
		// paint later filters behind earlier output, so document order already
		// matches.
		.map(s => `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${s.color})`)
		.join(' ')
	const shadowExtent = svgShadows.reduce(
		(m, s) => Math.max(m, Math.max(Math.abs(s.x), Math.abs(s.y)) + s.blur * 1.5 + Math.max(0, s.spread)),
		0
	)
	const pad = Math.ceil(blur * 3 + shadowExtent + filterPadding)
	return { svgShadows, cssShadowFilter, pad }
}
