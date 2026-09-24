<!--
@component
@module Liquid
@group Effects
@version 0.2.2
@remarks
Liquid UI: touching pieces merge like goo, stretch and bow like liquid, while text, icons and
images stay crisp. Ported from `liquid-gooey` in Libraries.dev by Jakub Antalik (MIT).

The group renders a `position: relative; isolation: isolate` div. Behind every child sits an
SVG silhouette layer holding one plain blob per `Liquid.Item`, run through the goo filter and a
shadow chain parsed from `box-shadow` syntax — so one shadow hugs the merged liquid through
every merge and split. Your real DOM rides crisp on top: give items transparent backgrounds,
the liquid below is their surface. Filters run on SVG content, never CSS `url()` on HTML, so
Safari renders it correctly.

Four effects per item: `morph` (default — pieces merge; give items `x`/`y` and the library
animates element and liquid in sync, optionally with `morph={{ shape: true }}` jelly
shape-change), `move` (the surface trails a moving element with a droplet tail), `bend` (the
body bows with velocity; publishes `--lg-bend-x/-y/-xn/-yn` on the child) and `melt` (two
images run molten into each other). `dissolve` melts an item's imagery into a touching
neighbour.

Size the group to contain the full travel of its items. Decorative layers under the liquid
need `z-index: -2`. For `move` / `bend` items, drive the child's transform with a
`style:transform` directive rather than a `style="…"` string: a changed style string replaces
the element's whole inline style, wiping the CSS variables and filters the engine writes.
Component-driven `x`/`y` transitions snap under `prefers-reduced-motion`.

`Liquid.Item` is attached as a static property, so `<Liquid.Item>` works in templates; the
same component is also exported as `LiquidItem`.

@example
```svelte
<script lang="ts">
  import { Liquid } from 'kitto/effects'

  let open = $state(false)
</script>

<Liquid blur={6} contrast={18} fill="#fff" shadow="0 2px 6px rgba(0,0,0,.08)" style="width: 200px; height: 140px">
  <Liquid.Item x={open ? -54 : 0} y={open ? -34 : 0} transition="bouncy" style="position: absolute; left: 80px; top: 80px">
    <button class="round-btn" aria-label="New file">…</button>
  </Liquid.Item>
  <Liquid.Item style="position: absolute; left: 80px; top: 80px">
    <button class="round-btn" aria-expanded={open} onclick={() => (open = !open)}>+</button>
  </Liquid.Item>
</Liquid>
```
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

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
</script>

<script lang="ts">
	import GooFilter from './goo_filter.svelte'
	import MeltLayer from './melt_layer.svelte'
	import { set_gooey_context } from './context.js'
	import { splitShadows } from './filter.js'
	import { createImageMeltRegistry } from './image_melt.js'
	import { ObserveEngine } from './observer.js'
	import { parseShadow } from './shadow.js'

	let {
		blur = 6,
		contrast = 18,
		fill = '#fff',
		shadow,
		filterPadding = 24,
		waviness = 0,
		wavinessFreq = 0.018,
		filter: customFilter,
		style,
		children,
		...rest
	}: LiquidProps = $props()

	let group = $state<HTMLDivElement>()
	let portal = $state.raw<SVGGElement | null>(null)
	let meltPortal = $state.raw<SVGGElement | null>(null)
	let size = $state({ w: 0, h: 0 })

	const id = $props.id()
	const filterId = `gooey-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
	const shadows = $derived(parseShadow(shadow))
	const split = $derived(splitShadows(shadows, blur, filterPadding))

	$effect(() => {
		const el = group
		if (!el) return
		const measure = () => {
			if (size.w !== el.offsetWidth || size.h !== el.offsetHeight)
				size = { w: el.offsetWidth, h: el.offsetHeight }
		}
		measure()
		const ro = new ResizeObserver(measure)
		ro.observe(el)
		return () => ro.disconnect()
	})

	const engine = new ObserveEngine(() => group ?? null)
	const imageMelt = createImageMeltRegistry()
	$effect(() => () => engine.dispose())
	$effect.pre(() => {
		engine.gooBlur = blur
	})

	set_gooey_context({
		get portal() {
			return portal
		},
		get meltPortal() {
			return meltPortal
		},
		get fill() {
			return fill
		},
		getGroup: () => group ?? null,
		engine,
		imageMelt
	})

	const getGroup = () => group ?? null
</script>

<div {...rest} bind:this={group} style="position: relative; isolation: isolate;{style ? ` ${style}` : ''}">
	<!-- z-index -1 inside the isolated group: the liquid paints above the group's
		own background but below every child, positioned or not. The CSS filter is
		the GPU half of the shadow stack; will-change promotes the filtered layer
		(WebKit otherwise repaints the goo a frame or two behind the content). -->
	<svg
		aria-hidden="true"
		focusable="false"
		data-gooey-svg=""
		style:position="absolute"
		style:inset="0"
		style:width="100%"
		style:height="100%"
		style:overflow="visible"
		style:pointer-events="none"
		style:z-index="-1"
		style:filter={split.cssShadowFilter || undefined}
		style:will-change="filter, transform">
		<defs>
			<filter
				id={filterId}
				filterUnits="userSpaceOnUse"
				x={-split.pad}
				y={-split.pad}
				width={size.w + split.pad * 2}
				height={size.h + split.pad * 2}
				color-interpolation-filters="sRGB">
				{#if customFilter}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html customFilter}
				{:else}
					<GooFilter {blur} {contrast} shadows={split.svgShadows} {waviness} {wavinessFreq} />
				{/if}
			</filter>
		</defs>
		<g id="{filterId}-sil" bind:this={portal} filter="url(#{filterId})" style:fill></g>
	</svg>
	<!-- Melt overlay: warped-image copies render here, ABOVE the content layer
		(z-index 9999, scoped by the isolated group). SVG content so
		displacement/blur filters work in WebKit. -->
	<svg
		aria-hidden="true"
		focusable="false"
		data-gooey-overlay=""
		style:position="absolute"
		style:inset="0"
		style:width="100%"
		style:height="100%"
		style:overflow="visible"
		style:pointer-events="none"
		style:z-index="9999">
		<defs>
			<!-- The melt may only paint where LIQUID exists: the mask re-renders the
				goo-filtered silhouette (<use> across the two svgs), so the warped
				copies are clipped to the merged surface. -->
			<mask
				id="{filterId}-meltmask"
				maskUnits="userSpaceOnUse"
				x={-split.pad}
				y={-split.pad}
				width={size.w + split.pad * 2}
				height={size.h + split.pad * 2}>
				<use href="#{filterId}-sil" />
			</mask>
		</defs>
		<g mask="url(#{filterId}-meltmask)">
			<g bind:this={meltPortal}></g>
		</g>
	</svg>
	{@render children?.()}
	<MeltLayer registry={imageMelt} {getGroup} />
</div>
