<!--
@component
@module MetalBadge
@group Effects
@remarks
"New" badge — Figma: Portfolio › tab 3 (1458:40880), applied verbatim. A 45×25 white pill with
the live liquid-metal shader as a full-pill mask, a clean white core under the label (so the
text sits on white and metal creeps in at the rim), an optional top→bottom white wash, and soft
inset glows plus hairline rims. The halo follows the pill's perimeter (`glowMode="ring"`).

The gradient and inset shadows sit on an overlay inside the content layer: above the metal canvas
and below the text. Always uses the `chromatic` preset.
@example
```svelte
<script lang="ts">
  import { MetalBadge } from 'kitto/effects'
</script>

<li>
  <span>Live mode</span>
  <MetalBadge>New</MetalBadge>
</li>
```
-->
<script lang="ts">
	import type { Snippet } from 'svelte'
	import MetalFx from './index.svelte'
	import type { MaskFn } from './engine/renderer/core.js'
	import {
		BADGE_H,
		BADGE_PAD_X,
		BADGE_RADIUS,
		BADGE_W,
		METAL_BADGE_DEFAULTS,
		badgeShadow,
		type MetalBadgeCore
	} from './badge_config.js'
	import type { MetalFxReflectionTarget, MetalFxTheme } from './types.js'

	interface Props {
		/** Badge label. Overrides `text` when given. */
		children?: Snippet
		/** Badge label as a string (upstream's `children: string`). @default 'New' */
		text?: string
		/** Effect strength (0..1), multiplied with `metalOpacity`. @default 1 */
		strength?: number
		/** Theme mode, see `MetalFx`. @default 'auto' */
		theme?: MetalFxTheme
		/** Size multiplier on the Figma metrics (45×25, 12.222px). @default 1 */
		scale?: number
		/** Neighbour elements that catch a proximity reflection (dark theme only). */
		reflectionTargets?: ReadonlyArray<MetalFxReflectionTarget>
		/** How much metal shows over the white fill (0..1), multiplied with `strength`. @default 0.8 */
		metalOpacity?: number
		/** Zoom of the metal. @default 1.6 */
		shaderScale?: number
		/** White core under the label. @default { r: 46, blur: 100, a: 0.94, size: 49 } */
		core?: MetalBadgeCore
		/** Top→bottom white wash strength (0..1). @default 0 */
		gradient?: number
		/** Inner white glow strength (0..1). @default 0.41 */
		glow?: number
		/** Label colour. @default '#323232' */
		textColor?: string
		/** The MetalFx wrapper element. Bind with `bind:element`. */
		element?: HTMLDivElement | null
	}

	let {
		children,
		text = 'New',
		strength = 1,
		theme,
		scale = 1,
		reflectionTargets,
		metalOpacity = METAL_BADGE_DEFAULTS.metalOpacity,
		shaderScale = METAL_BADGE_DEFAULTS.shaderScale,
		core = METAL_BADGE_DEFAULTS.core,
		gradient = METAL_BADGE_DEFAULTS.gradient,
		glow = METAL_BADGE_DEFAULTS.glow,
		textColor = '#323232',
		element = $bindable(null)
	}: Props = $props()

	// Full-fill mask: the pill itself.
	const mask: MaskFn = (ctx, w, h, dpr) => {
		ctx.beginPath()
		ctx.roundRect(0, 0, w, h, BADGE_RADIUS * dpr)
		ctx.fill()
	}

	const r = $derived(`${BADGE_RADIUS * scale}px`)
</script>

<MetalFx
	bind:element
	preset="chromatic"
	{theme}
	strength={strength * metalOpacity}
	{shaderScale}
	{mask}
	glowMode="ring"
	{reflectionTargets}
	borderRadius={BADGE_RADIUS * scale}
	style="background: #ffffff; border-radius: {r}">
	<!-- Inline layout only — no utility classes, so the badge renders the same with or without a
	     CSS framework on the host page. MetalFx normalises the *direct* child's background and
	     box-shadow, so the overlays are nested one level down under this plain wrapper. -->
	<div style="position: relative; width: {BADGE_W * scale}px; height: {BADGE_H * scale}px; border-radius: {r}">
		<!-- layer 3b — clean white core under the label (rim-only metal) -->
		<div
			aria-hidden="true"
			style="position: absolute; inset: 0; pointer-events: none; border-radius: {r}"
			style:background="radial-gradient(ellipse {core.size}% {core.size}% at 50% 50%, rgba(255,255,255,1) {core.r}%,
			rgba(255,255,255,0) {Math.min(100, core.r + core.blur)}%)"
			style:opacity={core.a}>
		</div>
		<!-- layers 3 + 5 — white gradient and inset rims, over the metal -->
		<div
			aria-hidden="true"
			style="position: absolute; inset: 0; pointer-events: none; border-radius: {r}"
			style:background="linear-gradient(to bottom, rgba(255,255,255,{gradient}), rgba(255,255,255,0))"
			style:box-shadow={badgeShadow(scale, glow)}>
		</div>
		<span
			style="position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; letter-spacing: 0; white-space: nowrap"
			style:width="{BADGE_W * scale}px"
			style:height="{BADGE_H * scale}px"
			style:padding-left="{BADGE_PAD_X * scale}px"
			style:padding-right="{BADGE_PAD_X * scale}px"
			style:font="600 {12.222 * scale}px/1.4 Inter, sans-serif"
			style:color={textColor}
			aria-label={children ? undefined : text}
			>{#if children}{@render children()}{:else}{text}{/if}</span>
	</div>
</MetalFx>
