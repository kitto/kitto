<!--
@component
@module VoiceBeam
@group Effects
@remarks
A sound-reactive glow: a centred, colourful beam along the bottom edge of the wrapped element that
rises and blooms with the level of a voice, then gathers into one travelling beam while the reply
is `processing`. Feed it a microphone `stream` (see {@link use_microphone}), or drive it yourself
with `level` — a number, or a getter sampled once per frame without re-rendering.

Pure CSS layers (a per-instance stylesheet, `::before` / `::after`, a bloom div), a small band
canvas and an SVG displacement filter, all stepped by one shared requestAnimationFrame loop capped
near 60 fps. Offscreen instances unregister and release their analyser. `prefers-reduced-motion`
stops the idle breathing, the flow, the hue drift, the warp and the processing sweep; the reaction
to sound stays.

The corner radius is read from the first child element (16px if none) and the wrapper clips with
`overflow: hidden`, so wrap exactly one element that carries the radius. Content that must stay
crisp above the bloom wants `position: relative; z-index: 5`. With `theme="auto"` the first render
(and SSR) uses the dark tuning, then follows `prefers-color-scheme` once mounted.

The wrapper element is available through `bind:element`.
@example
```svelte
<script lang="ts">
  import { VoiceBeam, use_microphone } from 'kitto/effects'

  let { thinking = false } = $props()
  const mic = use_microphone()
</script>

<VoiceBeam stream={mic.stream} processing={thinking}>
  <div style="border-radius: 20px; padding: 24px; background: #1d1d1d">
    <textarea placeholder="Ask anything"></textarea>
  </div>
</VoiceBeam>

<button onclick={mic.state === 'live' ? mic.stop : mic.start} aria-pressed={mic.state === 'live'}>
  {mic.state === 'live' ? 'Stop' : 'Listen'}
</button>
```
-->
<script module lang="ts">
	/* WebKit (Safari) evaluates SVG filters on HTML content on the CPU every
	   paint, which on a phone-sized host drops the frame rate by an order of
	   magnitude, so the displacement warp is off there above this host area:
	   a chat input (~39k px²) or a pill keeps it, the phone crop (~97k px²)
	   and any real screen do not. Its 2D canvas also has no `filter`, so the
	   band's blur is done in CSS on two canvases instead (the ridge and its
	   wider halo), keeping Chromium's look. */
	const WEBKIT_WARP_MAX_AREA = 60_000
	// Every iOS browser is WebKit whatever its name (CriOS, FxiOS); only
	// desktop Blink carries "Chrome/".
	const IS_WEBKIT =
		typeof navigator !== 'undefined' &&
		/AppleWebKit/.test(navigator.userAgent) &&
		!/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent)

	let canvasFilter: boolean | null = null
	/** Whether a 2D canvas supports `filter`. True on the server, probed once on the client. */
	function hasCanvasFilter(): boolean {
		if (typeof document === 'undefined') return true
		if (canvasFilter === null) {
			let ctx: CanvasRenderingContext2D | null = null
			try {
				ctx = document.createElement('canvas').getContext('2d')
			} catch {
				/* no 2D canvas */
			}
			canvasFilter = !!ctx && typeof (ctx as { filter?: unknown }).filter === 'string'
		}
		return canvasFilter
	}

	/** Band colour defaults per theme, as `r, g, b` triples. */
	const BAND_COLORS = {
		dark: { core: '255, 255, 255', above: '255, 70, 80', mid: '90, 255, 150', below: '80, 140, 255' },
		light: { core: '197, 139, 255', above: '255, 122, 182', mid: '126, 196, 255', below: '45, 255, 171' }
	} as const

	const BORDER_WIDTH = 1
	const DEFAULT_RADIUS = 16
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import type { VoiceBeamProps } from './types.js'
	import { themePresets, generateVoiceBeamCSS } from './styles.js'
	import { registerVoiceInstance, type VoiceDriverConfig } from './driver.js'
	import { resolveVoiceDefaults, resolveVoiceStyle } from './presets.js'
	import { toTriple } from './color.js'

	let {
		children,
		type = 'default',
		scale: scaleProp,
		stream = null,
		level = 0,
		sensitivity = 3.1,
		threshold = 0.015,
		attack = 0.325,
		release = 0.86,
		idle: idleProp,
		breatheDuration = 5.2,
		reach: reachProp,
		spread: spreadProp,
		bands = true,
		flow: flowProp,
		processing = false,
		processingDuration: processingDurationProp,
		processingLevel: processingLevelProp,
		processingTravel: processingTravelProp,
		processingCurve: processingCurveProp,
		cornerFollow: cornerFollowProp,
		processingEase = 0.6,
		colorVariant = 'colorful',
		colors,
		bandColors,
		theme = 'dark',
		staticColors = false,
		hueRange: hueRangeProp,
		hueDuration: hueDurationProp,
		active = true,
		paused = false,
		borderRadius: customBorderRadius,
		brightness: brightnessProp,
		saturation: saturationProp,
		glowSize: glowSizeProp,
		strokeOpacity: strokeOpacityProp,
		innerOpacity: innerOpacityProp,
		bloomOpacity: bloomOpacityProp,
		bend: bendProp,
		bandStrength: bandStrengthProp,
		bandWidth: bandWidthProp,
		bandPosition: bandPositionProp,
		bandCurve: bandCurveProp,
		bandSpread: bandSpreadProp,
		bandSkew: bandSkewProp,
		bandOffset: bandOffsetProp,
		bandTail: bandTailProp,
		bandTailPosition: bandTailPositionProp,
		bandTailCurve: bandTailCurveProp,
		bandTailOverflow: bandTailOverflowProp,
		bandAberration: bandAberrationProp,
		distortion: distortionProp,
		distortionDetail: distortionDetailProp,
		glowWidth: glowWidthProp,
		glowHeight: glowHeightProp,
		lobeSpacing: lobeSpacingProp,
		rangeWidth: rangeWidthProp,
		rangeHeight: rangeHeightProp,
		softness: softnessProp,
		coreSize: coreSizeProp,
		coreLight: coreLightProp,
		coreLightWidth: coreLightWidthProp,
		coreLightHeight: coreLightHeightProp,
		strokeScale: strokeScaleProp,
		innerScale: innerScaleProp,
		innerHeight: innerHeightProp,
		bloomScale: bloomScaleProp,
		bloomHeight: bloomHeightProp,
		strength: strengthProp,
		class: className,
		style,
		css: extraCss,
		onLevel,
		onActivate,
		onDeactivate,
		onanimationend: consumerOnAnimationEnd,
		element = $bindable(null),
		...rest
	}: VoiceBeamProps & { element?: HTMLDivElement | null } = $props()

	const id = $props.id()

	// SSR and the first render use the dark tuning / full motion; the real
	// preferences are read once mounted and followed from there.
	let systemTheme = $state<'dark' | 'light'>('dark')
	let reducedMotion = $state(false)
	$effect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return
		const dark = window.matchMedia('(prefers-color-scheme: dark)')
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
		systemTheme = dark.matches ? 'dark' : 'light'
		reducedMotion = reduce.matches
		const onTheme = (e: MediaQueryListEvent) => (systemTheme = e.matches ? 'dark' : 'light')
		const onMotion = (e: MediaQueryListEvent) => (reducedMotion = e.matches)
		dark.addEventListener?.('change', onTheme)
		reduce.addEventListener?.('change', onMotion)
		return () => {
			dark.removeEventListener?.('change', onTheme)
			reduce.removeEventListener?.('change', onMotion)
		}
	})

	const resolvedTheme = $derived(theme === 'auto' ? systemTheme : theme)

	// The type preset supplies the geometry defaults; an explicit prop
	// wins; `scale` then multiplies every pixel dimension as one.
	const d = $derived(resolveVoiceDefaults(type, resolvedTheme))
	const sc = $derived(Math.max(0.05, scaleProp ?? d.scale))
	const glowSize = $derived(glowSizeProp ?? d.glowSize)
	const strokeOpacityMul = $derived(strokeOpacityProp ?? d.strokeOpacity)
	const innerOpacityMul = $derived(innerOpacityProp ?? d.innerOpacity)
	const bloomOpacityMul = $derived(bloomOpacityProp ?? d.bloomOpacity)
	const processingDuration = $derived(processingDurationProp ?? d.processingDuration)
	const processingLevel = $derived(processingLevelProp ?? d.processingLevel)
	const processingTravel = $derived(processingTravelProp ?? d.processingTravel)
	const processingCurve = $derived(processingCurveProp ?? d.processingCurve)
	const cornerFollow = $derived(cornerFollowProp ?? d.cornerFollow)
	const idle = $derived(idleProp ?? d.idle)
	const reach = $derived(reachProp ?? d.reach)
	const spread = $derived(spreadProp ?? d.spread)
	const flow = $derived((flowProp ?? d.flow) * sc)
	const bend = $derived((bendProp ?? d.bend) * sc)
	const bandStrength = $derived(bandStrengthProp ?? d.bandStrength)
	const bandWidth = $derived((bandWidthProp ?? d.bandWidth) * sc)
	const bandPosition = $derived(bandPositionProp ?? d.bandPosition)
	const bandCurve = $derived(bandCurveProp ?? d.bandCurve)
	const bandSpread = $derived(bandSpreadProp ?? d.bandSpread)
	const bandSkew = $derived(bandSkewProp ?? d.bandSkew)
	const bandOffset = $derived((bandOffsetProp ?? d.bandOffset) * sc)
	const bandTail = $derived(bandTailProp ?? d.bandTail)
	const bandTailPosition = $derived(bandTailPositionProp ?? d.bandTailPosition)
	const bandTailCurve = $derived(bandTailCurveProp ?? d.bandTailCurve)
	const bandTailOverflow = $derived((bandTailOverflowProp ?? d.bandTailOverflow) * sc)
	const bandAberration = $derived(bandAberrationProp ?? d.bandAberration)
	const distortionBase = $derived(distortionProp ?? d.distortion)
	const distortionDetail = $derived((distortionDetailProp ?? d.distortionDetail) / sc)
	const glowWidth = $derived((glowWidthProp ?? d.glowWidth) * sc)
	const glowHeight = $derived((glowHeightProp ?? d.glowHeight) * sc)
	const lobeSpacing = $derived((lobeSpacingProp ?? d.lobeSpacing) * sc)
	const rangeWidth = $derived((rangeWidthProp ?? d.rangeWidth) * sc)
	const rangeHeight = $derived((rangeHeightProp ?? d.rangeHeight) * sc)
	const softness = $derived(softnessProp ?? d.softness)
	const coreSize = $derived((coreSizeProp ?? d.coreSize) * sc)
	const coreLight = $derived(Math.max(0, Math.min(3, coreLightProp ?? d.coreLight)))
	const coreLightWidth = $derived(coreLightWidthProp ?? d.coreLightWidth)
	const coreLightHeight = $derived(coreLightHeightProp ?? d.coreLightHeight)
	const strokeScale = $derived(strokeScaleProp ?? d.strokeScale)
	const innerScale = $derived(innerScaleProp ?? d.innerScale)
	const innerHeight = $derived(innerHeightProp ?? d.innerHeight)
	const bloomScale = $derived(bloomScaleProp ?? d.bloomScale)
	const bloomHeight = $derived(bloomHeightProp ?? d.bloomHeight)

	// untrack: the initial value only; the effect below follows `active`.
	let isActive = $state(untrack(() => active))
	let isFading = $state(false)
	let isVisible = $state(true)
	let detectedRadius = $state<number | null>(null)
	/* The host's area, measured on WebKit only, to keep the warp off large hosts there. */
	let hostArea = $state(0)
	// Whether the band needs its CSS-blurred halo canvas; read after mount so SSR matches.
	let mounted = $state(false)
	onMount(() => {
		mounted = true
	})
	const canvasFilterOk = $derived(mounted ? hasCanvasFilter() : true)

	$effect(() => {
		if (!IS_WEBKIT) return
		const el = element
		if (!el) return
		const measure = () => (hostArea = el.clientWidth * el.clientHeight)
		measure()
		if (typeof ResizeObserver === 'undefined') return
		const ro = new ResizeObserver(measure)
		ro.observe(el)
		return () => ro.disconnect()
	})
	const distortion = $derived(IS_WEBKIT && hostArea > WEBKIT_WARP_MAX_AREA ? 0 : distortionBase)

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

	// Stop the per-frame work while the element is scrolled offscreen.
	$effect(() => {
		const el = element
		if (!el || typeof IntersectionObserver === 'undefined') return
		const observer = new IntersectionObserver(
			entries => {
				for (const entry of entries) isVisible = entry.isIntersecting
			},
			{ rootMargin: '256px' }
		)
		observer.observe(el)
		return () => observer.disconnect()
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

	const preset = $derived(themePresets[resolvedTheme])
	const finalBorderRadius = $derived(customBorderRadius ?? detectedRadius ?? DEFAULT_RADIUS)
	const typeStyle = $derived(resolveVoiceStyle(type, resolvedTheme))
	const strength = $derived(strengthProp ?? typeStyle.strength ?? preset.strength ?? 1)
	const hueRange = $derived(hueRangeProp ?? preset.hueRange ?? 24)
	const hueDuration = $derived(hueDurationProp ?? preset.hueDuration ?? 12)
	const finalBrightness = $derived(brightnessProp ?? typeStyle.brightness ?? preset.brightness)
	const finalSaturation = $derived(saturationProp ?? typeStyle.saturation ?? preset.saturation)

	const cssStyles = $derived(
		generateVoiceBeamCSS({
			id,
			borderRadius: finalBorderRadius,
			borderWidth: BORDER_WIDTH,
			strokeOpacity: preset.strokeOpacity * strokeOpacityMul,
			innerOpacity: preset.innerOpacity * innerOpacityMul,
			bloomOpacity: preset.bloomOpacity * bloomOpacityMul,
			innerShadow: preset.innerShadow,
			colorVariant,
			colors,
			brightness: finalBrightness,
			saturation: finalSaturation,
			theme: resolvedTheme,
			hueBase: preset.hueBase ?? 0,
			glowSize: glowSize * sc,
			glowWidth,
			glowHeight,
			strokeScale,
			innerScale,
			innerHeight,
			bloomScale,
			bloomHeight,
			coreSize,
			coreLight,
			coreLightWidth,
			coreLightHeight,
			rangeWidth,
			rangeHeight,
			softness,
			distortion: distortion > 0,
			scale: sc
		})
	)

	const sheet = $derived(
		// The tag is split so the preprocessor does not mistake this string for a style block.
		`<${'style'}>${extraCss ? `${cssStyles}\n${extraCss.split('{id}').join(id)}` : cssStyles}</${'style'}>`
	)

	// Runtime config for the shared driver. Numbers and strings only, so it is
	// compared by value (below) and an equal config does not re-register.
	const driverConfig = $derived<VoiceDriverConfig>({
		id,
		sensitivity: Math.max(0, sensitivity),
		threshold: Math.max(0, Math.min(0.95, threshold)),
		attack: Math.max(0, attack),
		release: Math.max(0, release),
		idle: Math.max(0, Math.min(1, idle)),
		breatheDuration: Math.max(0.2, breatheDuration),
		reach: Math.max(0, reach),
		spread: Math.max(0, spread),
		bands,
		flow,
		lobeSpacing: Math.max(0.1, lobeSpacing),
		bend: Math.max(0, bend),
		bandStrength: Math.max(0, bandStrength),
		bandWidth: Math.max(0, bandWidth),
		bandPosition: Math.max(0, bandPosition),
		bandCurve: Math.max(0.3, bandCurve),
		bandSpread: Math.max(0.05, bandSpread),
		bandSkew: Math.max(-0.9, Math.min(0.9, bandSkew)),
		bandOffset,
		bandTail: Math.max(0, Math.min(1.5, bandTail)),
		bandTailPosition: Math.max(0, Math.min(0.98, bandTailPosition)),
		bandTailCurve: Math.max(0.5, bandTailCurve),
		bandTailOverflow: Math.max(0, bandTailOverflow),
		bandAberration: Math.max(0, Math.min(1, bandAberration)),
		rangeWidth,
		rangeHeight,
		theme: resolvedTheme,
		bandColors: {
			core: (bandColors?.core && toTriple(bandColors.core)) || BAND_COLORS[resolvedTheme].core,
			above: (bandColors?.above && toTriple(bandColors.above)) || BAND_COLORS[resolvedTheme].above,
			mid: (bandColors?.mid && toTriple(bandColors.mid)) || BAND_COLORS[resolvedTheme].mid,
			below: (bandColors?.below && toTriple(bandColors.below)) || BAND_COLORS[resolvedTheme].below
		},
		distortion: Math.max(0, Math.min(1, distortion)),
		coreLight,
		scale: sc,
		radius: finalBorderRadius,
		processing,
		processingDuration: Math.max(0.05, processingDuration),
		processingLevel: Math.max(0, Math.min(1, processingLevel)),
		processingEase: Math.max(0.05, processingEase),
		processingTravel: Math.max(0, processingTravel),
		processingCurve: Math.max(1, processingCurve),
		cornerFollow: Math.max(0, Math.min(1, cornerFollow)),
		hueRange: Math.max(0, hueRange),
		hueDuration: Math.max(0.5, hueDuration),
		staticColors: colorVariant === 'mono' ? true : staticColors,
		reducedMotion,
		paused
	})
	const driverKey = $derived(JSON.stringify(driverConfig))

	// The manual level and the onLevel callback are read per frame, outside
	// any effect, so a changing value does not tear the driver down and up.
	const getLevel = () => {
		const current = level
		return typeof current === 'function' ? current() : current
	}
	const report = (value: number) => onLevel?.(value)

	$effect(() => {
		void driverKey
		if (!(isActive || isFading) || !isVisible) return
		const el = element
		if (!el) return
		const source = { stream, getLevel }
		return untrack(() => registerVoiceInstance(el, driverConfig, source, report))
	})
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated from numeric props, parsed colours and fixed palettes -->
{@html sheet}
<div
	{...rest}
	bind:this={element}
	data-voice-beam={id}
	data-voice-type={type}
	data-voice-halfres=""
	data-active={isActive && !isFading ? '' : undefined}
	data-fading={isFading ? '' : undefined}
	data-paused={isActive && !isFading && (!isVisible || paused) ? '' : undefined}
	data-listening={stream ? '' : undefined}
	data-processing={processing ? '' : undefined}
	class={className}
	{style}
	style:--voice-strength={Math.max(0, Math.min(1, strength))}
	onanimationend={handleAnimationEnd}>
	{@render children?.()}
	<div data-voice-beam-bloom></div>
	{#if distortion > 0}
		<!-- Mirrors of the inner light and bloom, clipped to below the band line and carrying the displacement filter. -->
		<div data-voice-beam-warp="inner"></div>
		<div data-voice-beam-warp="bloom"></div>
	{/if}
	{#if !canvasFilterOk}
		<canvas data-voice-beam-band-halo aria-hidden="true"></canvas>
	{/if}
	<canvas data-voice-beam-band aria-hidden="true"></canvas>
	<!-- After the band canvases, so the wash sits over the band's halo under the line (it is clipped to
	     below the line, so the ridge itself stays) while the host's own content stays above it. -->
	{#if coreLight > 0}
		<div data-voice-beam-core><div></div></div>
	{/if}
	{#if distortion > 0}
		<!-- The distortion filter: drifting fractal noise, its green channel pinned to 0.5 so only x
		     displaces, driven per frame by the driver (scale and offset), which also narrows the region
		     to the strip under the band line once it runs. Zero-sized, so it takes no room. -->
		<svg aria-hidden="true" width="0" height="0" style="position: absolute; pointer-events: none">
			<filter
				id="vb-distort-{id}"
				x="-20%"
				y="-20%"
				width="140%"
				height="140%"
				color-interpolation-filters="sRGB">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="{(0.012 * distortionDetail).toFixed(4)} {(0.05 * distortionDetail).toFixed(4)}"
					numOctaves={2}
					seed={7}
					result="noise" />
				<feOffset in="noise" dx="0" dy="0" result="moved" />
				<feColorMatrix
					in="moved"
					type="matrix"
					values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1"
					result="map" />
				<feDisplacementMap in="SourceGraphic" in2="map" scale={0} xChannelSelector="R" yChannelSelector="G" />
			</filter>
		</svg>
	{/if}
</div>
