<!--
	Mirrored (component-driven) item: x / y / scale animate the wrapper and its
	blob from ONE JS clock, so content and liquid can never tear apart.
-->
<script lang="ts">
	import type { Snippet } from 'svelte'
	import { untrack } from 'svelte'
	import { prefersReducedMotion } from 'svelte/motion'
	import type { HTMLAttributes } from 'svelte/elements'
	import type { GooeyContextValue } from './context.js'
	import {
		measureRadius,
		normalizeRadius,
		offsetTo,
		roundedRectPath,
		type BlobBox,
		type CornerRadii
	} from './geometry.js'
	import { easingFunction, resolveTransition, type Transition } from './spring.js'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		ctx: GooeyContextValue
		x?: number
		y?: number
		scale?: number
		transition?: Transition
		delay?: number
		radius?: number | CornerRadii
		children?: Snippet
	}

	let {
		ctx,
		x = 0,
		y = 0,
		scale = 1,
		transition = 'smooth',
		delay = 0,
		radius,
		children,
		style,
		...rest
	}: Props = $props()

	const SVG_NS = 'http://www.w3.org/2000/svg'

	let wrap = $state<HTMLDivElement>()
	let box = $state.raw<BlobBox | null>(null)
	let blobEl: SVGGraphicsElement | null = null
	let cur: { x: number; y: number; s: number } | null = null

	const tKey = $derived(typeof transition === 'string' ? transition : JSON.stringify(transition ?? null))
	const resolved = $derived.by(() => {
		void tKey
		const reduced = prefersReducedMotion.current
		return untrack(() => resolveTransition(transition, reduced))
	})
	const duration = $derived(resolved.duration)
	const easing = $derived(resolved.easing)

	function sameBox(a: BlobBox | null, b: BlobBox): boolean {
		return !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.r.every((v, i) => v === b.r[i])
	}

	const radiusKey = $derived(radius == null ? '' : JSON.stringify(radius))
	$effect(() => {
		void radiusKey
		const el = wrap
		const group = ctx.getGroup()
		if (!el || !group) return
		return untrack(() => {
			const measure = () => {
				const base = offsetTo(el, group)
				const w = el.offsetWidth
				const h = el.offsetHeight
				const target = (el.firstElementChild as HTMLElement | null) ?? el
				const r: CornerRadii = radius != null ? normalizeRadius(radius) : measureRadius(target, w, h)
				const next: BlobBox = { x: base.x, y: base.y, w, h, r }
				if (!sameBox(box, next)) box = next
			}
			measure()
			const ro = new ResizeObserver(measure)
			ro.observe(el)
			ro.observe(group)
			return () => ro.disconnect()
		})
	})

	function transformOf(px: number, py: number, ps: number): string {
		return `translate(${px}px, ${py}px)` + (ps !== 1 ? ` scale(${ps})` : '')
	}

	// Content and blob are animated by ONE JS clock — no CSS transition on the
	// wrapper. A compositor transition keeps playing through a main-thread
	// stall while the blob (always written from JS) freezes; under Safari's
	// SVG-filter load that read as icons and photos sailing away from their own
	// liquid. With both written in the same rAF tick from the same easing
	// curve, they can only ever move together.
	function writeTransform(px: number, py: number, ps: number) {
		const t = transformOf(px, py, ps)
		if (wrap) wrap.style.transform = t
		if (blobEl) blobEl.style.transform = t
	}

	// The blob lives in the group's silhouette layer. A uniform radius renders
	// as a <rect>; per-corner radii need a <path>.
	$effect(() => {
		const portal = ctx.portal
		const b = box
		if (!portal || !b) return
		const [tl, tr, br, bl] = b.r
		const uniform = tl === tr && tr === br && br === bl
		const el = document.createElementNS(SVG_NS, uniform ? 'rect' : 'path')
		if (uniform) {
			// Clamp to min(w,h)/2: SVG clamps rx and ry independently, so a large
			// radius on a wide short box (the `border-radius: 999px` pill idiom)
			// would degenerate into an ellipse instead of a pill.
			const rx = Math.max(0, Math.min(tl, Math.min(b.w, b.h) / 2))
			el.setAttribute('x', String(b.x))
			el.setAttribute('y', String(b.y))
			el.setAttribute('width', String(b.w))
			el.setAttribute('height', String(b.h))
			el.setAttribute('rx', String(rx))
		} else {
			el.setAttribute('d', roundedRectPath(b.x, b.y, b.w, b.h, b.r))
		}
		el.style.transformBox = 'fill-box'
		el.style.transformOrigin = 'center'
		el.style.willChange = 'transform'
		// The blob (re)mounts whenever the measured box changes; catch it up to
		// the currently rendered value immediately.
		const c = cur ?? untrack(() => ({ x, y, s: scale }))
		el.style.transform = transformOf(c.x, c.y, c.s)
		portal.append(el)
		blobEl = el
		return () => {
			el.remove()
			if (blobEl === el) blobEl = null
		}
	})

	// A changed `style` string replaces the wrapper's whole inline style
	// (cssText), dropping the imperative transform — put it straight back.
	$effect(() => {
		void style
		if (cur) untrack(() => cur && writeTransform(cur.x, cur.y, cur.s))
	})

	$effect(() => {
		const tx = x
		const ty = y
		const ts = scale
		const dur = duration
		const ease = easingFunction(easing)
		const wait = delay
		const from = cur
		if (!from || dur <= 0 || (from.x === tx && from.y === ty && from.s === ts)) {
			cur = { x: tx, y: ty, s: ts }
			writeTransform(tx, ty, ts)
			return
		}
		// Retarget like a CSS transition: from the currently rendered value, full
		// duration. `delay` holds at the start value first (stagger).
		const f = { ...from }
		const start = performance.now() + wait
		let raf = 0
		const tick = (now: number) => {
			const p = Math.min(1, Math.max(0, (now - start) / dur))
			const e = ease(p)
			const cx = f.x + (tx - f.x) * e
			const cy = f.y + (ty - f.y) * e
			const cs = f.s + (ts - f.s) * e
			cur = { x: cx, y: cy, s: cs }
			writeTransform(cx, cy, cs)
			if (p < 1) raf = requestAnimationFrame(tick)
		}
		raf = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(raf)
	})
</script>

<!-- `transform` is owned imperatively (see above) — the template must never
	render it, or a re-render mid-flight would snap to the target. -->
<div {...rest} bind:this={wrap} style="display: inline-block;{style ? ` ${style};` : ''} will-change: transform">
	{@render children?.()}
</div>
