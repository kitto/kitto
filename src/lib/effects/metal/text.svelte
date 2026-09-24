<!--
@component
@module MetalText
@group Effects
@remarks
Bare metal-filled text — the Pro badge's glyph treatment without the pill. `MetalFx`'s `mask`
paints the word with the same font and metrics as the live span, so layout and hit-testing stay
DOM. The metal is composited over the live text, so `color` is the tone the shader blends onto —
the design's own colour, not white. A computed top-edge light rim (`innerShadow`) sits above the
metal, and the optional glow is clipped to the glyphs.

Always uses the `chromatic` preset (every metal instance on a page shares one material). Pair it
with {@link metal_text_reflection} on a neighbouring label to have that label catch the metal.
@example
```svelte
<script lang="ts">
  import { MetalText, metal_text_reflection } from 'kitto/effects'

  let plan = $state<HTMLSpanElement | null>(null)
</script>

<span bind:this={plan} {@attach metal_text_reflection()}>Plan</span>
<MetalText
  font="500 24px/1.2 Inter, sans-serif"
  color="#E2E2E2"
  strength={0.9}
  reflectionTargets={[{ ref: plan, strength: 0.64 }]}
>
  Pro
</MetalText>
```
-->
<script lang="ts">
	import type { Snippet } from 'svelte'
	import MetalFx from './index.svelte'
	import type { MaskFn } from './engine/renderer/core.js'
	import { paintTextRun } from './engine/text_mask.js'
	import {
		FIGMA_INNER_SHADOW,
		METAL_TEXT_DEFAULTS,
		drawInnerShadow,
		ensureBareStyles,
		type TextInnerShadow
	} from './text_shadow.js'
	import type { MetalFxReflectionTarget, MetalFxTheme } from './types.js'

	interface Props {
		/** The word(s) to fill with metal. Plain text only — the mask is painted from `textContent`. */
		children?: Snippet
		/** The text as a string (upstream's `children: string`). Used when no `children` snippet is given, and as the span's `aria-label`. */
		text?: string
		/** CSS `font` shorthand for the live span, e.g. `500 24px/1 Inter, sans-serif`. */
		font: string
		/** Base text colour from the design; the metal composites over it. */
		color: string
		/** Effect strength (0..1), multiplied with `metalOpacity`. @default 1 */
		strength?: number
		/** Theme mode, see `MetalFx`. @default 'auto' */
		theme?: MetalFxTheme
		/** Neighbour elements that catch a proximity reflection (dark theme only). */
		reflectionTargets?: ReadonlyArray<MetalFxReflectionTarget>
		/** Class for the live text span. */
		class?: string
		/** Top-edge light rim inside the glyphs. Pass null to disable. */
		innerShadow?: TextInnerShadow | null
		/** Halo on the glyphs. Off by default — the design has none. @default false */
		glow?: boolean
		/** Glow multiplier when `glow` is on. @default 2.5 */
		glowGain?: number
		/** How much metal shows over the base colour (0..1), multiplied with `strength`. @default 0.62 */
		metalOpacity?: number
		/** Zoom of the metal inside the glyphs. @default 2.8 */
		shaderScale?: number
		/** The MetalFx wrapper element. Bind with `bind:element`. */
		element?: HTMLDivElement | null
	}

	let {
		children,
		text,
		font,
		color,
		strength = 1,
		theme,
		reflectionTargets,
		class: className,
		innerShadow = FIGMA_INNER_SHADOW,
		glow = false,
		glowGain = METAL_TEXT_DEFAULTS.glowGain,
		metalOpacity = METAL_TEXT_DEFAULTS.metalOpacity,
		shaderScale = METAL_TEXT_DEFAULTS.shaderScale,
		element = $bindable(null)
	}: Props = $props()

	let textEl = $state<HTMLSpanElement | null>(null)

	$effect(() => {
		ensureBareStyles()
	})

	// Inner-shadow overlay: above the metal (6) and the glow (7), redrawn when
	// fonts land or the box changes. Static otherwise.
	$effect(() => {
		const root = element,
			t = textEl,
			sh = innerShadow
		if (!root || !t || !sh) return
		const cv = document.createElement('canvas')
		cv.className = 'metal-fx-text-rim'
		cv.setAttribute('aria-hidden', 'true')
		cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:8'
		root.appendChild(cv)
		const draw = () => drawInnerShadow(cv, root, t, sh)
		draw()
		let alive = true
		document.fonts?.ready.then(() => {
			if (alive) draw()
		})
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
		ro?.observe(root)
		// Browser zoom changes the DPR without changing the CSS box, so the
		// ResizeObserver stays quiet; re-rasterise from a resolution query.
		let mql: MediaQueryList | null = null
		const watchDpr = () => {
			mql?.removeEventListener('change', onDpr)
			mql =
				typeof window.matchMedia === 'function'
					? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
					: null
			mql?.addEventListener('change', onDpr)
		}
		const onDpr = () => {
			if (!alive) return
			draw()
			watchDpr()
		}
		watchDpr()
		return () => {
			alive = false
			ro?.disconnect()
			mql?.removeEventListener('change', onDpr)
			cv.remove()
		}
	})

	const mask: MaskFn = (ctx, _w, _h, dpr) => {
		const root = element,
			t = textEl
		if (root && t) paintTextRun(ctx, root, t, dpr)
	}
</script>

<MetalFx
	bind:element
	data-mfx-bare=""
	preset="chromatic"
	{theme}
	strength={strength * metalOpacity}
	{glowGain}
	disableGlow={!glow}
	{mask}
	{reflectionTargets}
	{shaderScale}
	borderRadius={4}
	style="background: transparent; border-radius: 4px">
	<span
		bind:this={textEl}
		class={className}
		style:font
		style:color
		style:letter-spacing="0"
		style:white-space="nowrap"
		aria-label={text}
		>{#if children}{@render children()}{:else}{text}{/if}</span>
</MetalFx>
