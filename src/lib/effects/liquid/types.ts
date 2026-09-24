import type { Snippet } from 'svelte'
import type { HTMLAttributes } from 'svelte/elements'
import type { LiquidItemProps as LiquidItemOptions } from './tuning.js'

export interface LiquidProps extends HTMLAttributes<HTMLDivElement> {
	/** Goo blur sigma in px — how far apart pieces start bridging. Default 6. */
	blur?: number
	/** Alpha-contrast slope — how sharp the liquid edge is. Default 18. */
	contrast?: number
	/** Fill of the liquid surface. Any CSS color, `var()` welcome. Default '#fff'. */
	fill?: string
	/** `box-shadow` syntax; rendered on the MERGED silhouette. `inset` layers
	 *  paint inside the liquid edge (inner rings / top highlights). */
	shadow?: string
	/** Extra filter-region slack in px for blobs travelling outside the group box. Default 24. */
	filterPadding?: number
	/** Max px the liquid boundary undulates — the silhouette (and its shadows)
	 *  run through a gentle noise displacement, so edges read as fluid instead
	 *  of geometric. 0 (default) keeps the calm edge. */
	waviness?: number
	/** Noise frequency of the undulation; lower = longer, lazier waves. Default 0.018. */
	wavinessFreq?: number
	/** Escape hatch: raw SVG filter primitives that REPLACE the goo chain
	 *  (`blur`, `contrast`, `waviness` and the SVG half of `shadow` are then
	 *  yours to reproduce). The input is `SourceGraphic`; the last primitive's
	 *  output is what paints. Inset and spread shadows normally read a
	 *  binarised `shape` result — keep that name if you keep them. */
	filter?: string
	/** The group's pieces: `Liquid.Item`s plus any other content. */
	children?: Snippet
}

export interface LiquidItemProps
	extends LiquidItemOptions, Omit<HTMLAttributes<HTMLElement>, keyof LiquidItemOptions | 'children'> {
	/** The piece's content. Its first element is what the liquid measures. */
	children?: Snippet
}
