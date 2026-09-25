<!--
@component
@module ImageGeneration
@group Effects
@remarks
Animated WebGL image-generation loader. A churning pixel-mosaic shader fills the wrapped card while an image is
generated, then dissolves into the real image. Wrap a single sized element (the card); the wrapper sizes itself to
it and follows the child's computed corner radius.

Every card on the page shares one `THREE.WebGLRenderer` (one WebGL context), capped at 10 fps. Cards pause while
offscreen, and the loop stops entirely when nothing is active. There is no built-in `prefers-reduced-motion`
handling (matching upstream); pause the effect yourself while waiting, e.g. `paused={reduced && generating}`.

Imperative actions are exported functions on the component instance — bind it with `bind:this` and call
`triggerReveal`, `triggerHide`, `triggerRegenerate`, `isImageActive` or `element`.

Imported from its own entry point, `kitto/effects/image`, since it depends on `three`.

@example
```svelte
<script lang="ts">
  import { ImageGeneration } from 'kitto/effects/image'

  let fx: ImageGeneration
</script>

<ImageGeneration bind:this={fx} preset="pixels-mechanic" images={['/a.jpg', '/b.jpg']}>
  <div style="width: 320px; height: 320px; border-radius: 20px"></div>
</ImageGeneration>

<button onclick={() => fx.triggerReveal({ hold: 'manual' })}>Show</button>
<button onclick={() => fx.triggerRegenerate({ durationMs: 3000 })}>Regenerate</button>
```
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import {
		createCycle,
		createInstance,
		createReveal,
		destroyInstance,
		renderInstanceOnce,
		samplePaletteFromCanvas,
		setInstanceCardBg,
		setInstanceColors,
		setInstanceGap,
		setInstancePaused,
		setInstancePixelScale,
		setInstancePreset,
		setInstanceSpeed,
		setInstanceStrength,
		setInstanceVisible,
		setSharedFragmentShader,
		updateInstanceSize,
		type Cycle,
		type Instance,
		type SampledPalette
	} from './engine/index.js'
	import { PRESETS } from './presets/index.js'
	import {
		detect_theme,
		is_pixel_churn_preset,
		normalise_images,
		PIXEL_CHURN_PRESETS,
		resolve_initial_delay
	} from './helpers.js'
	import type { ImageGenerationHandle, ImageGenerationPreset, ImageGenerationProps } from './types.js'

	let {
		children,
		preset = 'pixels-organic',
		theme = 'auto',
		strength = 1,
		speed = 1,
		pixelScale = 1,
		gap,
		cardBg: cardBgProp,
		colors,
		images,
		autoReveal = false,
		revealDelayRange = [2, 4],
		revealInitialDelay,
		revealHoldMs = 2000,
		revealFadeOutMs = 300,
		borderRadius,
		paused = false,
		fragmentShader,
		onCycle,
		excludeSrcs,
		class: className,
		style,
		...rest
	}: ImageGenerationProps = $props()

	let root: HTMLDivElement | undefined = $state()
	let shaderCanvas: HTMLCanvasElement | undefined = $state()
	let overlayCanvas: HTMLCanvasElement | undefined = $state()
	let content: HTMLDivElement | undefined = $state()

	/** Live engine objects; `$state.raw` so the prop-sync effects re-run once the engine is up. */
	let engine = $state.raw<{ inst: Instance; cycle: Cycle } | null>(null)

	// Transient image-derived recolor for the regenerate churn. While set, it
	// overrides the palette + card surface (shader uniforms AND the wrapper's
	// CSS background) so the effect wears the outgoing image's colors; cleared
	// automatically when the next image reaches `visible`.
	let regenTint = $state.raw<SampledPalette | null>(null)

	// Transient preset override for the regenerate churn (always a pixel-mosaic
	// preset). Restored once the next image is fully visible.
	let regenPresetName = $state<ImageGenerationPreset | null>(null)

	/** Measured corner radius (CSS px), mirrored onto the wrapper. */
	let radius = $state<number | null>(null)

	let resolvedTheme: 'dark' | 'light' = $state(untrack(() => (theme !== 'auto' ? theme : detect_theme())))

	const presetMode = $derived(PRESETS[preset].modes[resolvedTheme])
	// Effective background colour (override > preset). Drives both the wrapper's
	// CSS background and the shader's `u_cardBg` uniform.
	const cardBg = $derived(cardBgProp ?? presetMode.cardBg)
	const imagesArr = $derived(normalise_images(images))

	// Resolve `revealInitialDelay` once; range tuples randomise here so updates never reseed it.
	const initialDelayMs = untrack(() => resolve_initial_delay(revealInitialDelay))

	const wrapperStyle = $derived(
		[
			// During a regenerate churn the card surface wears the outgoing image's average color.
			`background: ${regenTint?.cardBg ?? cardBg}`,
			style,
			radius === null ? null : `--image-gen-radius: ${radius}px; border-radius: ${radius}px`
		]
			.filter(Boolean)
			.join('; ')
	)

	/** The wrapper `<div>` element (or `null` before mount). */
	export const element: ImageGenerationHandle['element'] = () => root ?? null

	/** Run a reveal pass now. See {@link ImageGenerationHandle.triggerReveal}. */
	export const triggerReveal: ImageGenerationHandle['triggerReveal'] = opts => {
		engine?.cycle.triggerOnce(opts)
	}

	/** Fade the revealed image back to the shader. See {@link ImageGenerationHandle.triggerHide}. */
	export const triggerHide: ImageGenerationHandle['triggerHide'] = () => {
		engine?.cycle.triggerHide()
	}

	/** Break the shown image back into churning cells, then dissolve in the next one. */
	export const triggerRegenerate: ImageGenerationHandle['triggerRegenerate'] = opts => {
		const cycle = engine?.cycle
		if (!cycle || paused) return
		const phase = cycle.getPhase()
		if (phase !== 'reveal' && phase !== 'visible') return
		// The churn always runs on a pixel-mosaic preset: keep the active preset
		// when it's already one, otherwise temporarily switch to a random one.
		const churnName = is_pixel_churn_preset(preset)
			? null
			: PIXEL_CHURN_PRESETS[Math.floor(Math.random() * PIXEL_CHURN_PRESETS.length)]
		// Recolor the effect from the visible image so the churn reads as
		// pixelation born from that image. The sample maps onto the CHURN
		// preset's palette slots.
		if (opts?.tintFromImage ?? true) {
			if (overlayCanvas) {
				const churnColors = churnName ? PRESETS[churnName].modes[resolvedTheme].colors : presetMode.colors
				const sampled = samplePaletteFromCanvas(overlayCanvas, churnColors)
				if (sampled) regenTint = sampled
			}
		}
		if (churnName) regenPresetName = churnName
		const auto = opts?.autoReveal ?? true
		cycle.triggerBoil(auto ? { autoRevealAfterMs: opts?.durationMs ?? 4000 } : undefined)
	}

	/** Whether an image is revealing, visible or hiding. */
	export const isImageActive: ImageGenerationHandle['isImageActive'] = () => {
		const phase = engine?.cycle.getPhase() ?? 'idle'
		return phase === 'reveal' || phase === 'visible' || phase === 'hide'
	}

	// Theme resolution: live updates from matchMedia and a MutationObserver on <html>.
	$effect(() => {
		if (theme !== 'auto') {
			resolvedTheme = theme
			return
		}
		const update = (): void => {
			resolvedTheme = detect_theme()
		}
		update()

		const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
		mql?.addEventListener('change', update)

		let mo: MutationObserver | null = null
		if (typeof MutationObserver !== 'undefined') {
			mo = new MutationObserver(update)
			mo.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class', 'style', 'data-theme']
			})
		}

		return () => {
			mql?.removeEventListener('change', update)
			mo?.disconnect()
		}
	})

	// Lifecycle: create instance + reveal + cycle on mount, destroy on unmount.
	$effect(() => {
		const rootEl = root
		const shader = shaderCanvas
		const overlay = overlayCanvas
		if (!rootEl || !shader || !overlay) return

		return untrack(() => {
			// Size from the root's bounding box; corner radius from the wrapped
			// child's computed style (falls back to the root). The shader renders a
			// single uniform radius, so `borderTopLeftRadius` applies to all corners.
			const measure = (): { w: number; h: number; r: number } => {
				const rect = rootEl.getBoundingClientRect()
				const w = Math.max(1, Math.round(rect.width))
				const h = Math.max(1, Math.round(rect.height))
				let r = 0
				if (typeof borderRadius === 'number') {
					r = borderRadius
				} else {
					const childEl = content?.firstElementChild as HTMLElement | null | undefined
					if (childEl) {
						const parsed = parseFloat(getComputedStyle(childEl).borderTopLeftRadius)
						if (Number.isFinite(parsed) && parsed > 0) r = parsed
					}
					if (r === 0) {
						const parsed = parseFloat(getComputedStyle(rootEl).borderTopLeftRadius)
						if (Number.isFinite(parsed) && parsed > 0) r = parsed
					}
				}
				return { w, h, r }
			}

			const initial = measure()
			radius = initial.r

			// No WebGL / 2D canvas (SSR-less test envs, blocked GPU): leave the card as-is.
			let inst: Instance
			try {
				inst = createInstance({
					canvas: shader,
					cssWidth: initial.w,
					cssHeight: initial.h,
					preset: presetMode,
					strength,
					speed,
					cardBg: cardBgProp ?? null,
					pixelScale,
					gap
				})
			} catch {
				return
			}
			inst.canvas.style.opacity = String(Math.max(0, Math.min(1, strength)))

			let reveal
			try {
				reveal = createReveal({
					canvas: overlay,
					cssWidth: initial.w,
					cssHeight: initial.h,
					shaderCanvas: shader
				})
			} catch {
				destroyInstance(inst)
				return
			}
			inst.reveal = reveal

			// Cycle is created up-front (independent of `autoReveal`) so manual
			// `triggerReveal()` works too. `start()` is driven by `autoReveal` below.
			const cycle = createCycle({
				reveal,
				images: imagesArr,
				delayRange: revealDelayRange,
				holdMs: revealHoldMs,
				fadeOutMs: revealFadeOutMs,
				initialDelayMs,
				onPhase: e => {
					// A fully-visible image ends any regenerate churn.
					if (e.phase === 'visible') {
						regenTint = null
						regenPresetName = null
					}
					onCycle?.(e)
				},
				excludeSrcs: () => excludeSrcs?.() ?? null
			})
			if (paused) cycle.setPaused(true)
			engine = { inst, cycle }

			// Sync dimensions + corner radius with the host card. ResizeObserver on
			// root and child, MutationObserver on the child's class/style, all
			// coalesced through one rAF.
			let resizeRaf = 0
			let lastW = initial.w
			let lastH = initial.h
			let lastR = initial.r
			const applyMeasure = (): void => {
				resizeRaf = 0
				const next = measure()
				if (next.w !== lastW || next.h !== lastH) {
					updateInstanceSize(inst, next.w, next.h)
					lastW = next.w
					lastH = next.h
				}
				if (next.r !== lastR) {
					radius = next.r
					lastR = next.r
				}
			}
			const scheduleMeasure = (): void => {
				if (resizeRaf !== 0) return
				resizeRaf = requestAnimationFrame(applyMeasure)
			}

			const childEl = content?.firstElementChild as HTMLElement | null | undefined
			let ro: ResizeObserver | null = null
			if (typeof ResizeObserver !== 'undefined') {
				ro = new ResizeObserver(scheduleMeasure)
				ro.observe(rootEl)
				if (childEl) ro.observe(childEl)
			}

			let mo: MutationObserver | null = null
			if (childEl && typeof MutationObserver !== 'undefined') {
				mo = new MutationObserver(scheduleMeasure)
				mo.observe(childEl, { attributes: true, attributeFilter: ['class', 'style'] })
			}

			let io: IntersectionObserver | null = null
			if (typeof IntersectionObserver !== 'undefined') {
				io = new IntersectionObserver(
					entries => {
						for (const e of entries) setInstanceVisible(inst, e.isIntersecting)
					},
					{ rootMargin: '64px' }
				)
				io.observe(rootEl)
			}

			return () => {
				ro?.disconnect()
				mo?.disconnect()
				io?.disconnect()
				if (resizeRaf !== 0) cancelAnimationFrame(resizeRaf)
				cycle.dispose()
				reveal.dispose()
				destroyInstance(inst)
				engine = null
			}
		})
	})

	// Sync preset/theme and repaint once so paused instances reflect it. An
	// active regenerate churn preset takes precedence over the prop.
	$effect(() => {
		if (!engine) return
		const mode = regenPresetName ? PRESETS[regenPresetName].modes[resolvedTheme] : presetMode
		setInstancePreset(engine.inst, mode)
		renderInstanceOnce(engine.inst)
	})

	// Sync cardBg override (active regenerate tint wins), then repaint.
	$effect(() => {
		if (!engine) return
		setInstanceCardBg(engine.inst, regenTint?.cardBg ?? cardBgProp ?? null)
		renderInstanceOnce(engine.inst)
	})

	// Sync the palette override (active regenerate tint wins), then repaint.
	$effect(() => {
		if (!engine) return
		setInstanceColors(engine.inst, regenTint?.colors ?? colors ?? null)
		renderInstanceOnce(engine.inst)
	})

	// Strength drives the visible canvas opacity (no shader recompile).
	$effect(() => {
		if (!engine) return
		setInstanceStrength(engine.inst, strength)
		engine.inst.canvas.style.opacity = String(Math.max(0, Math.min(1, strength)))
	})

	$effect(() => {
		if (!engine) return
		setInstanceSpeed(engine.inst, speed)
	})

	$effect(() => {
		if (!engine) return
		setInstancePixelScale(engine.inst, pixelScale)
		renderInstanceOnce(engine.inst)
	})

	$effect(() => {
		if (!engine) return
		setInstanceGap(engine.inst, gap ?? null)
		renderInstanceOnce(engine.inst)
	})

	// Custom fragment stage: page-wide while set, back to the bundled one when dropped or unmounted.
	$effect(() => {
		if (!fragmentShader) return
		setSharedFragmentShader(fragmentShader)
		return () => setSharedFragmentShader(null)
	})

	$effect(() => {
		if (!engine) return
		setInstancePaused(engine.inst, paused)
		engine.cycle.setPaused(paused)
	})

	$effect(() => {
		engine?.cycle.setImages(imagesArr)
	})

	$effect(() => {
		engine?.cycle.setOptions({ delayRange: revealDelayRange, holdMs: revealHoldMs, fadeOutMs: revealFadeOutMs })
	})

	// Start/stop the auto-loop in response to `autoReveal`.
	$effect(() => {
		const cycle = engine?.cycle
		if (!cycle) return
		if (autoReveal) {
			cycle.start()
			return () => cycle.stop()
		}
		cycle.stop()
	})
</script>

<div
	{...rest}
	bind:this={root}
	class={['image-gen-root', className]}
	data-preset={preset}
	data-theme={resolvedTheme}
	data-paused={paused ? 'true' : undefined}
	style={wrapperStyle}>
	<canvas bind:this={shaderCanvas} class="image-gen-shader" aria-hidden="true"></canvas>
	<canvas bind:this={overlayCanvas} class="image-gen-overlay" aria-hidden="true"></canvas>
	<div bind:this={content} class="image-gen-child">
		{@render children?.()}
	</div>
</div>

<style>
	.image-gen-root {
		position: relative;
		display: inline-block;
		isolation: isolate;
		overflow: hidden;
		vertical-align: top;
		line-height: 0;
		flex: 0 0 auto;
	}

	.image-gen-shader,
	.image-gen-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		border-radius: inherit;
		display: block;
	}

	.image-gen-shader {
		z-index: 1;
	}

	.image-gen-overlay {
		z-index: 2;
	}

	.image-gen-child {
		position: relative;
		z-index: 0;
		display: block;
		line-height: normal;
	}
</style>
