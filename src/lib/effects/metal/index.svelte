<!--
@component
@module MetalFx
@group Effects
@remarks
Wraps any element with an animated liquid-metal ring (Paper Shaders' `liquidMetal`, WebGL2) plus a
wandering halo, optional proximity reflections on neighbouring elements and a cursor light. Every
visible instance on the page shares one offscreen GL canvas and one requestAnimationFrame loop
(~15 fps composite); each instance copies a cropped/scaled slice onto its own 2D canvas with a
rounded hole punched through the centre. Offscreen instances are skipped and the loop stops while
the tab is hidden.

All instances share one material: the last `preset`/`theme` applied wins. Reflections render in
the dark theme only. Without WebGL2 (and during SSR) the child renders plain inside
`div.metal-fx-fallback[data-metal-fx-unsupported]`; the metal version swaps in once mounted. The
wrapper stays invisible until the first metal frame is painted.

The shader does not honour `prefers-reduced-motion` on its own (same as upstream) — pass `paused`
(and optionally `disableGlow`) yourself. The cursor light turns itself off under reduced motion.

The wrapper element is available through `bind:element`. For the cursor-driven liquid dent, put
`{@attach metal_bend()}` on the component (see {@link metal_bend}).
@example
```svelte
<script lang="ts">
  import { MetalFx, metal_bend } from 'kitto/effects'

  let chip = $state<HTMLButtonElement | null>(null)
</script>

<MetalFx preset="chromatic" strength={1}>
  <button style="height: 40px; padding: 0 16px; border-radius: 999px">Upgrade to Pro</button>
</MetalFx>

<button bind:this={chip}>Auto</button>
<MetalFx variant="circle" innerShadow strength={0.9} reflectionTargets={[chip]} {@attach metal_bend()}>
  <button aria-label="Send" style="width: 40px; height: 40px; border-radius: 999px">↑</button>
</MetalFx>
```
-->
<script lang="ts" module>
	import type { MetalFxInstance } from './engine/renderer/core.js'
	import { setGlowCallback } from './engine/renderer/loop.js'
	import { injectGlow, updateGlow } from './engine/glow/glow.js'
	import { ensureStylesInjected } from './styles.js'

	// Runs at module scope so styles exist before the first component render.
	// No-op during SSR.
	ensureStylesInjected()

	// Maps each live instance to its SVG glow handles and a theme ref.
	// Keyed by instance (not component) because the same component can be
	// remounted with a new instance after shape changes.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- engine bookkeeping, not reactive state
	const glowHandlesMap = new Map<
		MetalFxInstance,
		{ handles: ReturnType<typeof injectGlow>; themeRef: { current: 'dark' | 'light' } }
	>()
	// Opt-in introspection for dev tooling: with `globalThis.__MFX_DEBUG__ = true`
	// the live instance → glow map is exposed as `globalThis.__mfxGlow`.
	function exposeGlowDebug(): void {
		const g = globalThis as { __MFX_DEBUG__?: boolean; __mfxGlow?: unknown }
		if (g.__MFX_DEBUG__) g.__mfxGlow = glowHandlesMap
	}

	// Bridge between the shared animation loop and per-instance glow SVGs.
	setGlowCallback((inst, nowMs) => {
		const entry = glowHandlesMap.get(inst)
		if (!entry) return false
		return updateGlow(entry.handles, inst, nowMs, inst.opacityMul * inst.glowGain, entry.themeRef.current)
	})
</script>

<script lang="ts">
	import { untrack } from 'svelte'
	import {
		createInstance,
		destroyInstance,
		registerGlowInstance,
		setInstanceVisible,
		setSharedPreset,
		unregisterGlowInstance,
		updateInstance,
		refreshInstanceDpr
	} from './engine/renderer/loop.js'
	import { carryGlowState, updateGlowMask, type GlowOptions } from './engine/glow/glow.js'
	import { attachCursorLight, detachCursorLight } from './engine/cursor/light.js'
	import {
		RIM_DEFAULTS,
		injectRim,
		removeRim,
		updateRim,
		type RimHandles,
		type RimOptions
	} from './engine/rim.js'
	import { subscribeGlowConfig } from './engine/glow/config.js'
	import { addReflectionTarget, removeReflectionTarget } from './engine/reflection/paint.js'
	import { isMetalFxSupported } from './engine/renderer/core.js'
	import { scheduleReflectionPaint } from './engine/reflection/reflection_scheduler.js'
	import type { MetalFxProps } from './types.js'

	let {
		children,
		variant = 'button',
		preset = 'chromatic',
		theme = 'auto',
		strength = 1,
		glowGain = 1,
		paused = false,
		borderRadius,
		normalizeHostStyles = true,
		reflectionTargets,
		disableGlow = false,
		innerShadow,
		shaderScale,
		ringCssPx,
		scale = 1,
		mask,
		glowMode = 'mask',
		class: className,
		style,
		element = $bindable(null),
		...rest
	}: MetalFxProps = $props()

	let canvasEl = $state<HTMLCanvasElement | null>(null)
	let glowHostEl = $state<HTMLDivElement | null>(null)
	let rimHostEl = $state<HTMLDivElement | null>(null)
	let contentEl = $state<HTMLDivElement | null>(null)
	let instance = $state.raw<MetalFxInstance | null>(null)
	let ready = $state(false)
	let radius = $state<number | null>(null)
	// No WebGL2 → no engine. Resolved on mount so SSR and the first client
	// render agree (fallback markup); the metal version swaps in right after.
	// eslint-disable-next-line svelte/prefer-writable-derived -- must stay false until mounted
	let supported = $state(false)

	// Resolves 'auto' to 'dark' | 'light' and keeps it in sync with the OS.
	let systemTheme = $state<'dark' | 'light'>(
		typeof window === 'undefined' || !window.matchMedia
			? 'dark'
			: window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light'
	)
	$effect(() => {
		if (theme !== 'auto') return
		if (typeof window === 'undefined' || !window.matchMedia) return
		const mql = window.matchMedia('(prefers-color-scheme: dark)')
		const update = () => (systemTheme = mql.matches ? 'dark' : 'light')
		update()
		mql.addEventListener('change', update)
		return () => mql.removeEventListener('change', update)
	})
	const resolvedTheme = $derived<'dark' | 'light'>(theme === 'auto' ? systemTheme : theme)

	// Read by the glow callback without a closure over a stale value.
	const themeRef: { current: 'dark' | 'light' } = { current: 'dark' }
	$effect.pre(() => {
		themeRef.current = resolvedTheme
	})

	const shape = $derived<'pill' | 'circle'>(variant === 'circle' ? 'circle' : 'pill')
	const glowEnabled = $derived(!disableGlow)

	let initialWrapperRadius = 0

	function resolveRadius(w: number, h: number): number {
		// variant='circle' is the user's explicit promise that the wrapped
		// element should render as a circle. Always pick min(w,h)/2 so the
		// engine produces a true circle even under CSS `zoom`.
		if (shape === 'circle') return Math.min(w, h) / 2

		const raw =
			typeof borderRadius === 'number'
				? borderRadius
				: (() => {
						const childEl = contentEl?.firstElementChild as HTMLElement | null | undefined
						if (childEl) {
							const parsed = parseFloat(getComputedStyle(childEl).borderTopLeftRadius)
							if (Number.isFinite(parsed) && parsed > 0) return parsed
						}
						return initialWrapperRadius
					})()
		return Math.min(raw, Math.min(w, h) / 2)
	}

	$effect(() => {
		supported = isMetalFxSupported()
	})

	$effect(() => {
		if (supported) setSharedPreset(preset, resolvedTheme)
	})
	$effect(() => {
		const m = mask ?? null
		if (instance) updateInstance(instance, { mask: m })
	})
	// `paused` is per-instance: it freezes only this instance's 2D canvas while
	// the shared GL loop keeps running for any other unpaused instance.
	$effect(() => {
		const p = paused
		if (instance) updateInstance(instance, { paused: p })
	})
	// Re-sync optional shader/ring/scale overrides if they change at runtime.
	$effect(() => {
		const patch: Partial<Parameters<typeof updateInstance>[1]> = {}
		if (shaderScale !== undefined) patch.shaderScale = shaderScale
		if (ringCssPx !== undefined) patch.ringCssPx = ringCssPx
		if (scale !== undefined) patch.scale = scale
		if (instance && Object.keys(patch).length > 0) updateInstance(instance, patch)
	})

	// Main lifecycle: re-created only when the shape changes (or the elements mount).
	$effect(() => {
		const canvas = canvasEl
		const root = element
		const glowHost = glowHostEl
		const kind = shape
		if (!canvas || !root || !supported) return

		return untrack(() => {
			{
				const parsed = parseFloat(getComputedStyle(root).borderTopLeftRadius)
				initialWrapperRadius = Number.isFinite(parsed) ? parsed : 0
			}

			const measure = () => {
				const rect = root.getBoundingClientRect()
				const cssWidth = Math.max(1, Math.round(rect.width))
				const cssHeight = Math.max(1, Math.round(rect.height))
				return { cssWidth, cssHeight, cornerRadius: resolveRadius(cssWidth, cssHeight) }
			}

			let inst: MetalFxInstance | null = null
			let glowHandles: ReturnType<typeof injectGlow> | null = null
			let rimHandles: RimHandles | null = null

			const initial = measure()
			inst = createInstance({
				onComposite: () => {
					if (inst && glowHandles) updateGlowMask(glowHandles, inst.deform)
					if (inst && rimHandles) updateRim(rimHandles, inst.deform)
				},
				hostCanvas: canvas,
				cssWidth: initial.cssWidth,
				cssHeight: initial.cssHeight,
				cornerRadius: initial.cornerRadius,
				kind,
				paused,
				shaderScale,
				ringCssPx,
				scale,
				mask: mask ?? null,
				onFirstCopy: () => (ready = true)
			})
			radius = initial.cornerRadius

			// Custom-mask instances feed the glow a point set inside the glyphs and
			// the mask itself as an image, so the halo sits *on the metal* and is
			// clipped to it — not to a ring band that doesn't exist.
			const glowMaskData = (w: number, h: number): Pick<GlowOptions, 'samplePoints' | 'maskDataUrl'> => {
				if (!mask || glowMode === 'ring') return {}
				const dpr = window.devicePixelRatio || 1
				const c = document.createElement('canvas')
				c.width = Math.max(1, Math.round(w * dpr))
				c.height = Math.max(1, Math.round(h * dpr))
				const g = c.getContext('2d')
				if (!g) return {}
				g.fillStyle = '#fff'
				mask(g, c.width, c.height, dpr)
				const d = g.getImageData(0, 0, c.width, c.height).data
				const pts: Array<{ x: number; y: number }> = []
				const step = Math.max(1, Math.round(2 * dpr)) // ~2 CSS px grid
				for (let y = step >> 1; y < c.height; y += step) {
					for (let x = step >> 1; x < c.width; x += step) {
						if (d[(y * c.width + x) * 4 + 3] > 128) pts.push({ x: x / dpr, y: y / dpr })
					}
				}
				return { samplePoints: pts, maskDataUrl: c.toDataURL('image/png') }
			}

			if (glowHost) {
				glowHandles = injectGlow(glowHost, {
					width: initial.cssWidth,
					height: initial.cssHeight,
					cornerRadius: initial.cornerRadius,
					kind,
					scale,
					...glowMaskData(initial.cssWidth, initial.cssHeight)
				})
			}

			const rebuildGlow = (dims: { cssWidth: number; cssHeight: number; cornerRadius: number }) => {
				if (!glowHost) return
				const prev = glowHandles
				glowHost.innerHTML = ''
				glowHandles = injectGlow(glowHost, {
					width: dims.cssWidth,
					height: dims.cssHeight,
					cornerRadius: dims.cornerRadius,
					kind,
					scale,
					...glowMaskData(dims.cssWidth, dims.cssHeight)
				})
				// A rebuild is a fresh, invisible glow. Carry the old one's state over so
				// a resize doesn't read as "the glow vanished, then came back elsewhere".
				if (prev) carryGlowState(prev, glowHandles)
				if (inst && glowHandles) glowHandlesMap.set(inst, { handles: glowHandles, themeRef })
			}

			const rimOpts = (): RimOptions | null => {
				if (!innerShadow) return null
				return innerShadow === true ? RIM_DEFAULTS : { ...RIM_DEFAULTS, ...innerShadow }
			}
			const rebuildRim = (dims: { cssWidth: number; cssHeight: number; cornerRadius: number }) => {
				const host = rimHostEl
				removeRim(rimHandles)
				rimHandles = null
				const o = rimOpts()
				if (!host || !inst || !o) return
				rimHandles = injectRim(
					host,
					{
						width: dims.cssWidth,
						height: dims.cssHeight,
						cornerRadius: dims.cornerRadius,
						kind,
						ring: inst.ringCssPx
					},
					o
				)
			}
			rebuildRim(initial)

			let resizeRaf = 0
			// Last dimensions the glow was built for. ResizeObserver fires on any box
			// change — including ones that leave the size identical — and rebuilding
			// the glow for those restarts it from invisible.
			let builtW = initial.cssWidth,
				builtH = initial.cssHeight,
				builtR = initial.cornerRadius
			let ro: ResizeObserver | null = null
			if (typeof ResizeObserver !== 'undefined') {
				ro = new ResizeObserver(() => {
					if (resizeRaf !== 0) return
					// RAF-debounce: coalesce multiple resize events within the same frame.
					resizeRaf = requestAnimationFrame(() => {
						resizeRaf = 0
						const next = measure()
						if (!inst) return
						const same =
							Math.abs(next.cssWidth - builtW) < 0.5 &&
							Math.abs(next.cssHeight - builtH) < 0.5 &&
							Math.abs(next.cornerRadius - builtR) < 0.5
						if (same) return
						builtW = next.cssWidth
						builtH = next.cssHeight
						builtR = next.cornerRadius
						updateInstance(inst, {
							cssWidth: next.cssWidth,
							cssHeight: next.cssHeight,
							cornerRadius: next.cornerRadius
						})
						radius = next.cornerRadius
						rebuildGlow(next)
						rebuildRim(next)
					})
				})
				ro.observe(root)
			}

			// Browser zoom changes the DPR but not the CSS box, so the observer above
			// stays quiet. A resolution query fires once per DPR change; re-arm it.
			let dprMql: MediaQueryList | null = null
			const onDpr = () => {
				if (inst && refreshInstanceDpr(inst)) {
					const next = measure()
					rebuildGlow(next)
					rebuildRim(next)
				}
				watchDpr()
			}
			const watchDpr = () => {
				dprMql?.removeEventListener('change', onDpr)
				dprMql =
					typeof window.matchMedia === 'function'
						? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
						: null
				dprMql?.addEventListener('change', onDpr)
			}
			watchDpr()

			// Glow markup params are baked into the SVG, so a live config change to
			// one of them means a rebuild.
			const unsubGlow = subscribeGlowConfig(markupChanged => {
				if (markupChanged && inst) rebuildGlow(measure())
			})

			// Skip GL compositing for off-screen instances.
			let io: IntersectionObserver | null = null
			if (typeof IntersectionObserver !== 'undefined') {
				io = new IntersectionObserver(
					entries => {
						if (!inst) return
						for (const e of entries) setInstanceVisible(inst, e.isIntersecting)
					},
					{ rootMargin: '64px' }
				)
				io.observe(root)
			}

			if (glowHandles) {
				glowHandlesMap.set(inst, { handles: glowHandles, themeRef })
				registerGlowInstance(inst)
			}
			attachCursorLight()
			exposeGlowDebug()
			instance = inst

			return () => {
				detachCursorLight()
				removeRim(rimHandles)
				rimHandles = null
				ro?.disconnect()
				dprMql?.removeEventListener('change', onDpr)
				io?.disconnect()
				unsubGlow()
				if (resizeRaf !== 0) cancelAnimationFrame(resizeRaf)
				if (inst) {
					glowHandlesMap.delete(inst)
					unregisterGlowInstance(inst)
					destroyInstance(inst)
				}
				inst = null
				instance = null
				glowHandles = null
				if (glowHost) glowHost.innerHTML = ''
			}
		})
	})

	// strength=1 maps directly to a full-opacity composite (opacityMul=1).
	$effect(() => {
		const opacityMul = Math.max(0, Math.min(1, strength))
		const gain = Math.max(0, glowGain)
		void variant
		if (instance) updateInstance(instance, { opacityMul, glowGain: gain })
	})

	// Reflections are dark-mode only — no DOM work in light mode.
	$effect(() => {
		const inst = instance
		const root = element
		const targets = reflectionTargets
		if (!inst || !root || !targets || resolvedTheme !== 'dark') return
		inst.onAfterFrame = scheduleReflectionPaint
		const live = targets.flatMap(r => {
			if (!r) return []
			const el = 'ref' in r ? r.ref : r
			const s = 'ref' in r ? (r.strength ?? 1) : 1
			return el ? [{ el, strength: s }] : []
		})
		for (const { el, strength: s } of live) addReflectionTarget(el, inst, root, s)
		return () => {
			inst.onAfterFrame = undefined
			for (const { el } of live) removeReflectionTarget(el)
		}
	})

	// Separate from the main lifecycle so borderRadius / variant / theme changes
	// re-sync the radius without destroying and recreating the instance.
	$effect(() => {
		const inst = instance
		void borderRadius
		void resolvedTheme
		void variant
		void shape
		if (!element || !inst) return
		const cornerRadius = untrack(() => resolveRadius(inst.cssWidth, inst.cssHeight))
		updateInstance(inst, { cornerRadius })
		radius = cornerRadius
	})

	const strengthVar = $derived(String(Math.min(1, Math.max(0, strength))))
</script>

{#if supported}
	<div
		{...rest}
		bind:this={element}
		class={className ? `metal-fx-root ${className}` : 'metal-fx-root'}
		data-variant={variant}
		data-shape={shape}
		data-theme={resolvedTheme}
		data-paused={paused ? 'true' : undefined}
		data-normalize={normalizeHostStyles ? 'true' : 'false'}
		{style}
		style:--mfx-strength={strengthVar}
		style:--mfx-radius={radius === null ? undefined : `${radius}px`}
		style:border-radius={radius === null ? undefined : `${radius}px`}
		style:opacity={ready ? 1 : 0}
		style:visibility={ready ? 'visible' : 'hidden'}
		style:transition={ready ? 'opacity 0.15s ease-out' : 'none'}>
		<canvas
			bind:this={canvasEl}
			class="metal-fx-canvas"
			style="position: absolute; inset: 0; width: 100%; height: 100%"></canvas>
		<div class="metal-fx-inner" aria-hidden="true" style="position: absolute; inset: 3px"></div>
		<div
			bind:this={glowHostEl}
			class="metal-fx-glow-host"
			aria-hidden="true"
			style="position: absolute; inset: 0; pointer-events: none; z-index: 3; border-radius: inherit"
			style:display={glowEnabled ? undefined : 'none'}>
		</div>
		{#if innerShadow}
			<div
				bind:this={rimHostEl}
				aria-hidden="true"
				style="position: absolute; inset: 0; pointer-events: none; z-index: 4">
			</div>
		{/if}
		<div bind:this={contentEl} class="metal-fx-content">{@render children?.()}</div>
	</div>
{:else}
	<!-- Graceful degradation: the wrapped element with its own styling intact. -->
	<div
		{...rest}
		bind:this={element}
		class={className ? `metal-fx-fallback ${className}` : 'metal-fx-fallback'}
		data-metal-fx-unsupported=""
		style="display: inline-flex; {style ?? ''}">
		{@render children?.()}
	</div>
{/if}
