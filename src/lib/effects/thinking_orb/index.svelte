<!--
@component
Dotted thought-orb loading indicator for AI and agent UIs.

@module ThinkingOrb
@group Effects
@remarks
A small, honestly-3D dotted orb painted on a plain 2D canvas (no WebGL, no filters) with nine
hand-tuned states, each naming something an agent can be doing. `size` picks a tuned design (64
for chat-avatar scale, 20 for inline text), not a scale factor. Ink follows the host theme: an
ancestor `data-theme` / `.dark` / `.light`, then `prefers-color-scheme`, both watched live.

One shared clock (`performance.now`) keeps every mounted orb in phase; each instance pauses while
offscreen or while the tab is hidden. `prefers-reduced-motion: reduce` renders a single static
frame. The canvas gets `role="img"` and a per-state `aria-label`; every other `<canvas>` attribute
passes through, and `bind:this` gives you the canvas element.

Ported from `thinking-orbs` in Libraries.dev by Jakub Antalik (MIT).
@example
```svelte
<script lang="ts">
  import { ThinkingOrb } from 'kitto/effects'
</script>

<ThinkingOrb state="searching" size={64} />
<span><ThinkingOrb state="composing" size={20} aria-hidden="true" /> Writing…</span>
```
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import { paintFrame } from './engine/core.js'
	import { scaleCounts, scaleRadii } from './engine/profiles.js'
	import { MODE_FRAMES } from './engine/registry.js'
	import { resolvePreset } from './presets.js'
	import { watchReducedMotion, watchResolvedDark } from './theme.js'
	import { attachGravity } from './gravity.js'
	import { LABELS, parseTint } from './tint.js'
	import type { ThinkingOrbProps } from './types.js'

	let {
		state: orbState = 'working',
		size = 64,
		theme = 'auto',
		speed = 1,
		paused = false,
		color,
		dots = 1,
		dotSize = 1,
		opts: optsOverride,
		frame: customFrame,
		gravity,
		style,
		'aria-label': ariaLabel,
		...rest
	}: ThinkingOrbProps = $props()

	let canvas: HTMLCanvasElement | undefined = $state()
	let dark = $state(true)
	let reduced = $state(false)

	// Objects are compared by content, so an inline literal does not restart the loop or
	// re-attach gravity whenever the parent re-renders.
	const optsKey = $derived(optsOverride ? JSON.stringify(optsOverride) : '')
	const gravityKey = $derived(gravity ? JSON.stringify(gravity) : '')

	$effect(() => {
		if (!canvas) return
		return watchResolvedDark(theme, canvas, v => (dark = v))
	})

	$effect(() => watchReducedMotion(v => (reduced = v)))

	$effect(() => {
		if (!canvas || !gravityKey) return
		const g = untrack(() => gravity)
		if (!g) return
		return attachGravity(canvas, g === true ? true : g)
	})

	$effect(() => {
		if (!canvas) return
		const el = canvas
		// tracked inputs
		void optsKey
		const s = orbState
		const sz = size
		const isDark = dark
		const spd = speed
		const isPaused = paused
		const isReduced = reduced
		const col = color
		const density = dots
		const radius = dotSize
		const frameOverride = customFrame
		const override = untrack(() => optsOverride)

		const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1)
		el.width = Math.round(sz * dpr)
		el.height = Math.round(sz * dpr)
		let c: CanvasRenderingContext2D | null
		try {
			c = el.getContext('2d')
		} catch {
			c = null
		}
		if (!c) return

		const { mode, speed: baseSpeed, opts: presetOpts } = resolvePreset(s, sz)
		// `dots` rescales every count knob of the resolved preset with the same
		// sqrt-paired scaler the presets themselves use, so density changes keep
		// the mode's balance. resolvePreset caches — never mutate its result.
		let opts = density !== 1 ? scaleCounts(presetOpts, Math.max(0.1, density)) : presetOpts
		if (radius !== 1) opts = scaleRadii(opts, Math.max(0.1, radius))
		// raw overrides land last, over everything the preset and multipliers set
		if (override) opts = { ...opts, ...override }
		const frameFn = frameOverride ?? MODE_FRAMES[mode]
		const tint = parseTint(col)
		const effSpeed = baseSpeed * spd

		const frame = (tSec: number) => {
			c.setTransform(dpr, 0, 0, dpr, 0, 0)
			c.clearRect(0, 0, sz, sz)
			paintFrame(c, frameFn(sz, tSec, opts), isDark, tint)
		}

		// reduced motion → one static, deterministic frame
		if (isReduced) {
			frame(0.6)
			return
		}

		let raf = 0
		let running = false
		const loop = () => {
			frame((performance.now() / 1000) * effSpeed)
			if (running) raf = requestAnimationFrame(loop)
		}
		const start = () => {
			if (running || isPaused) return
			running = true
			raf = requestAnimationFrame(loop)
		}
		const stop = () => {
			running = false
			cancelAnimationFrame(raf)
		}

		// draw at least one frame even when paused/offscreen
		frame((performance.now() / 1000) * effSpeed)

		// pause offscreen + on hidden tabs — free when not visible
		let visible = true
		const io =
			typeof IntersectionObserver !== 'undefined'
				? new IntersectionObserver(([entry]) => {
						visible = entry.isIntersecting
						if (visible && document.visibilityState !== 'hidden') start()
						else stop()
					})
				: null
		io?.observe(el)
		const onVis = () => {
			if (document.visibilityState === 'hidden') stop()
			else if (visible) start()
		}
		document.addEventListener('visibilitychange', onVis)
		if (!io) start()

		return () => {
			stop()
			io?.disconnect()
			document.removeEventListener('visibilitychange', onVis)
		}
	})
</script>

<canvas
	bind:this={canvas}
	role="img"
	aria-label={ariaLabel ?? LABELS[orbState]}
	style="width:{size}px;height:{size}px;display:block;{style ?? ''}"
	{...rest}></canvas>
