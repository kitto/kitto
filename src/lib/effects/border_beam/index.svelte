<!--
@component
@module BorderBeam
@group Effects
@remarks
An animated glow that rides the border of a card, button or input. Pure CSS layers (a per-instance
stylesheet generated at runtime, `::before` / `::after` plus an empty `[data-beam-bloom]` div) and,
for the pulse types, one shared requestAnimationFrame loop capped near 30 fps.

Two families: Rotate (`md`, `line`, `sm`) sends a beam around the border, Pulse (`pulse-inner`,
`pulse-outside`) breathes in place. The corner radius is read from the first child element, so put
the rounded element directly inside. Every type except `pulse-outside` clips the wrapper.

Toggling `active` fades in (0.6 s) or out (0.5 s); inactive beams render no layers. Offscreen
instances pause. Pulse types honour `prefers-reduced-motion`; Rotate types do not, so gate `active`
yourself. With `theme="auto"` the first render (and SSR) uses the dark tuning, then follows
`prefers-color-scheme` once mounted.

The wrapper element is available through `bind:element`.
@example
```svelte
<script lang="ts">
  import { BorderBeam } from 'kitto/effects'

  let streaming = $state(true)
</script>

<BorderBeam active={streaming} strength={0.8}>
  <form style="border-radius: 16px; background: #1d1d1d">
    <textarea placeholder="Ask anything" aria-busy={streaming}></textarea>
  </form>
</BorderBeam>

<BorderBeam size="pulse-inner" colorVariant="mono" style="display: inline-block">
  <button style="border-radius: 18px">Generate</button>
</BorderBeam>
```
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import type { BorderBeamProps } from './types.js'
	import { sizePresets, sizeThemePresets, generateBeamCSS, getPulseDriverConfig } from './styles.js'
	import { registerPulseInstance } from './pulse_driver.js'

	let {
		children,
		size = 'md',
		colorVariant = 'colorful',
		theme = 'dark',
		staticColors = false,
		duration,
		active = true,
		borderRadius: customBorderRadius,
		brightness: brightnessProp,
		saturation,
		hueRange = 30,
		glowSize = 1,
		strength = 1,
		class: className,
		style,
		css: extraCss,
		onActivate,
		onDeactivate,
		onanimationend: consumerOnAnimationEnd,
		element = $bindable(null),
		...rest
	}: BorderBeamProps = $props()

	const id = $props.id()

	let systemTheme = $state<'dark' | 'light'>('dark')
	// Seeded once from the prop, as upstream's useState(active); the effects below follow later changes
	let isActive = $state(untrack(() => active))
	let isFading = $state(false)
	let isVisible = $state(true)
	let detectedRadius = $state<number | null>(null)
	let pulseGlowScale = $state({ x: 1, y: 1 })

	// Follow prefers-color-scheme (only consulted when theme === 'auto')
	$effect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		systemTheme = mediaQuery.matches ? 'dark' : 'light'
		const handler = (e: MediaQueryListEvent) => {
			systemTheme = e.matches ? 'dark' : 'light'
		}
		mediaQuery.addEventListener?.('change', handler)
		return () => mediaQuery.removeEventListener?.('change', handler)
	})

	// Auto-detect child border radius when no explicit value is provided
	$effect(() => {
		if (customBorderRadius != null) return
		const el = element
		if (!el) return

		const detect = () => {
			const child = el.firstElementChild as HTMLElement | null
			if (!child) return
			const raw = parseFloat(getComputedStyle(child).borderTopLeftRadius)
			if (!isNaN(raw) && raw > 0) detectedRadius = raw
		}

		detect()

		// Re-detect if child layout changes (e.g. CSS loaded late)
		if (typeof MutationObserver === 'undefined') return
		const observer = new MutationObserver(detect)
		observer.observe(el, { childList: true, subtree: false })
		return () => observer.disconnect()
	})

	$effect(() => {
		if (active && !isActive && !isFading) {
			isActive = true
		} else if (!active && isActive && !isFading) {
			isFading = true
		}
	})

	// Pause the (paint-heavy) animations while the element is scrolled offscreen.
	// This stops per-frame painting entirely for hidden instances without changing
	// their logical active/fading state, so it never fires onActivate/onDeactivate.
	$effect(() => {
		const el = element
		if (!el || typeof IntersectionObserver === 'undefined') return

		const observer = new IntersectionObserver(
			entries => {
				for (const entry of entries) isVisible = entry.isIntersecting
			},
			// Start animating slightly before the element scrolls into view.
			{ rootMargin: '256px' }
		)

		observer.observe(el)
		return () => observer.disconnect()
	})

	// Pulse Outside glow geometry is authored in fixed pixels for a reference
	// element (~350x140). Measure the actual wrapped element and scale the glow
	// per-axis so the halo grows/shrinks to fit any component it's applied to.
	$effect(() => {
		if (size !== 'pulse-outside') {
			pulseGlowScale = { x: 1, y: 1 }
			return
		}

		const el = element
		if (!el) return

		const REF_WIDTH = 350
		const REF_HEIGHT = 140
		// Allow the glow to both shrink (small buttons) and grow (large cards),
		// with generous bounds to avoid degenerate geometry at the extremes.
		const MIN_SCALE = 0.35
		const MAX_SCALE = 4
		const clamp = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value))

		const measure = () => {
			const child = el.firstElementChild as HTMLElement | null
			if (!child) return
			const rect = child.getBoundingClientRect()
			if (!rect.width || !rect.height) return
			const x = +clamp(rect.width / REF_WIDTH).toFixed(3)
			const y = +clamp(rect.height / REF_HEIGHT).toFixed(3)
			const prev = untrack(() => pulseGlowScale)
			if (prev.x !== x || prev.y !== y) pulseGlowScale = { x, y }
		}

		measure()
		if (typeof ResizeObserver === 'undefined') return

		const child = el.firstElementChild as HTMLElement | null
		if (!child) return

		const resizeObserver = new ResizeObserver(measure)
		resizeObserver.observe(child)
		return () => resizeObserver.disconnect()
	})

	function handleAnimationEnd(e: AnimationEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const animationName = e.animationName

		if (animationName.includes('fade-out')) {
			isActive = false
			isFading = false
			onDeactivate?.()
		} else if (animationName.includes('fade-in')) {
			onActivate?.()
		}

		consumerOnAnimationEnd?.(e)
	}

	const resolvedTheme = $derived(theme === 'auto' ? systemTheme : theme)
	const themeConfig = $derived(sizeThemePresets[size][resolvedTheme])
	const sizeConfig = $derived(sizePresets[size])

	const isPulse = $derived(size === 'pulse-inner' || size === 'pulse-outside')

	const finalBorderRadius = $derived(customBorderRadius ?? detectedRadius ?? sizeConfig.borderRadius)
	const finalDuration = $derived(duration ?? (size === 'line' ? 3.1 : isPulse ? 2.3 : 1.96))
	const finalSaturation = $derived(saturation ?? themeConfig.saturation)
	const finalBrightness = $derived(brightnessProp ?? themeConfig.brightness ?? 1.3)
	const finalHueRange = $derived(size === 'line' ? Math.min(hueRange, 13) : hueRange)
	const finalStaticColors = $derived(colorVariant === 'mono' ? true : staticColors)

	const cssStyles = $derived(
		generateBeamCSS({
			id,
			borderRadius: finalBorderRadius,
			borderWidth: sizeConfig.borderWidth,
			duration: finalDuration,
			strokeOpacity: themeConfig.strokeOpacity,
			innerOpacity: themeConfig.innerOpacity,
			bloomOpacity: themeConfig.bloomOpacity,
			innerShadow: themeConfig.innerShadow,
			size,
			colorVariant,
			staticColors: finalStaticColors,
			brightness: finalBrightness,
			saturation: finalSaturation,
			hueRange: finalHueRange,
			theme: resolvedTheme,
			hairlineOpacity: themeConfig.hairlineOpacity,
			glowSize
		})
	)

	const sheet = $derived(
		// Split tag literals so Svelte's preprocessor doesn't mistake them for this component's own block
		`<${'style'}>${extraCss ? `${cssStyles}\n${extraCss.split('{id}').join(id)}` : cssStyles}</${'style'}>`
	)

	// Runtime config for the JS breathing driver (null for non-pulse sizes).
	const driverConfig = $derived(
		isPulse
			? getPulseDriverConfig(size, resolvedTheme, finalDuration, finalHueRange, finalStaticColors, id)
			: null
	)

	// Drive the Pulse breathing from the shared, fps-capped rAF loop while the
	// instance is on, onscreen, and the user hasn't requested reduced motion.
	$effect(() => {
		const config = driverConfig
		if (!config) return
		if (!(isActive || isFading) || !isVisible) return

		const el = element
		if (!el) return

		if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
			return
		}

		return registerPulseInstance(el, config)
	})

	const mergedStyle = $derived(
		[
			style,
			`--beam-strength: ${Math.max(0, Math.min(1, strength))}`,
			size === 'pulse-outside'
				? `--pulse-glow-sx: ${pulseGlowScale.x}; --pulse-glow-sy: ${pulseGlowScale.y}`
				: ''
		]
			.filter(Boolean)
			.join('; ')
	)
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated from numeric props and fixed palettes -->
{@html sheet}
<div
	{...rest}
	bind:this={element}
	data-beam={id}
	data-active={isActive && !isFading ? '' : undefined}
	data-fading={isFading ? '' : undefined}
	data-paused={isActive && !isFading && !isVisible ? '' : undefined}
	class={className}
	style={mergedStyle}
	onanimationend={handleAnimationEnd}>
	{@render children()}
	<div data-beam-bloom></div>
</div>
