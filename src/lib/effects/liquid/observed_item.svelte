<!--
	Observe-mode item: you animate the child however you like; the shared
	measurement engine mirrors its rendered rect onto a blob in the group's
	silhouette layer, with optional evolve / move dynamics and contact melt.
-->
<script lang="ts">
	import type { Snippet } from 'svelte'
	import { untrack } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'
	import type { GooeyContextValue } from './context.js'
	import { normalizeRadius, type CornerRadii } from './geometry.js'
	import {
		EVOLVE_DEFAULTS,
		MOVE_DEFAULTS,
		type BlendConfig,
		type EvolveOptions,
		type MoveOptions
	} from './observer.js'
	import type { DissolveOptions, GooeyEffect } from './tuning.js'

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		ctx: GooeyContextValue
		effect: GooeyEffect[]
		evolve?: EvolveOptions
		move?: MoveOptions
		contactBlur?: DissolveOptions
		radius?: number | CornerRadii
		blobInset?: number
		bridgeGrow?: number
		children?: Snippet
	}

	let {
		ctx,
		effect: effects,
		evolve,
		move,
		contactBlur,
		radius,
		blobInset,
		bridgeGrow,
		children,
		style,
		...rest
	}: Props = $props()

	const SVG_NS = 'http://www.w3.org/2000/svg'

	let host = $state<HTMLSpanElement>()
	let blob = $state.raw<SVGRectElement | null>(null)
	let meltHost = $state.raw<SVGGElement | null>(null)

	// The blob lives in the group's silhouette layer (React rendered it through
	// a portal; here it is created imperatively once the portal exists).
	$effect(() => {
		const portal = ctx.portal
		if (!portal) return
		const rect = document.createElementNS(SVG_NS, 'rect')
		for (const [k, v] of Object.entries({ x: '0', y: '0', width: '0', height: '0' })) rect.setAttribute(k, v)
		rect.style.willChange = 'transform'
		// Dynamics scale (stretch / squash) about the blob's own centre.
		rect.style.transformBox = 'fill-box'
		rect.style.transformOrigin = 'center'
		portal.append(rect)
		blob = rect
		return () => {
			rect.remove()
			blob = null
		}
	})

	const wantsMelt = $derived(contactBlur !== undefined)
	$effect(() => {
		const portal = ctx.meltPortal
		if (!wantsMelt || !portal) return
		const g = document.createElementNS(SVG_NS, 'g')
		g.setAttribute('opacity', '0')
		portal.append(g)
		meltHost = g
		return () => {
			g.remove()
			meltHost = null
		}
	})

	const opts = $derived(contactBlur ?? {})
	const blend = $derived({
		blur: opts.blur ?? 8,
		warp: opts.warp ?? 26,
		pull: opts.pull ?? 4,
		range: opts.range,
		zone: opts.zone,
		mix: opts.mix ?? 0,
		gravity: opts.gravity ?? 60,
		taper: opts.taper ?? 1,
		warpFreq: opts.warpFreq ?? 1.7,
		flowSpeed: opts.flowSpeed ?? 22,
		warpStyle: opts.warpStyle ?? 'fractalNoise',
		detail: opts.detail ?? 2,
		active: opts.active !== false,
		releaseMs: opts.releaseMs ?? 240,
		fadeMs: opts.fadeMs,
		strength: opts.strength ?? 1,
		// Left undefined when unset so the engine owns the default in one place.
		sink: opts.sink,
		surface: opts.surface,
		seamBlur: opts.seamBlur
	})

	const dynamics = $derived({
		evolve: effects.includes('evolve'),
		move: effects.includes('move'),
		evolveOpts: { ...EVOLVE_DEFAULTS, ...evolve },
		moveOpts: { ...MOVE_DEFAULTS, ...move }
	})
	const hasDynamics = $derived(dynamics.evolve || dynamics.move)

	const radiusKey = $derived(radius == null ? '' : JSON.stringify(radius))
	// `active` is intentionally NOT in the key: it changes every drag and must
	// not tear down the melt structure — the engine reads it live.
	const blendKey = $derived.by(() => {
		if (!contactBlur) return ''
		const b = blend
		return `${b.blur}/${b.warp}/${b.pull}/${b.range ?? 'auto'}/${b.zone ?? 'auto'}/${b.mix}/${b.gravity}/${b.taper}/${b.warpFreq}/${b.flowSpeed}/${b.warpStyle}/${b.detail}/${b.surface ?? 'liquid'}/${(b.seamBlur ?? 1) > 0 ? 'seam' : 'noseam'}`
	})
	const effectKey = $derived(
		effects.join(',') +
			(dynamics.evolve ? JSON.stringify(dynamics.evolveOpts) : '') +
			(dynamics.move ? JSON.stringify(dynamics.moveOpts) : '')
	)

	/** The live melt config the engine holds — patched in place below. */
	let live: BlendConfig | null = null

	$effect(() => {
		// Rebuild only when the structural keys (or the mounted nodes) change.
		void radiusKey
		void blendKey
		void effectKey
		void blobInset
		void bridgeGrow
		const target = (host?.firstElementChild as HTMLElement | null) ?? null
		const b = blob
		const mh = meltHost
		const engine = ctx.engine
		// The engine wires its wake sources to the group on add, so wait for it.
		if (!target || !b || !ctx.getGroup()) return
		return untrack(() => {
			const cfg: BlendConfig | undefined = contactBlur && mh ? { host: mh, ...blend } : undefined
			live = cfg ?? null
			return engine.add({
				target,
				blob: b,
				radius: radius == null ? undefined : normalizeRadius(radius)[0],
				blobInset,
				bridgeGrow,
				blend: cfg,
				dynamics: hasDynamics ? dynamics : undefined
			})
		})
	})

	// `active` / `releaseMs` / `fadeMs` / `strength` / `sink` are pushed
	// straight into the live config so a drag release (or a strength slider)
	// updates the melt without rebuilding its SVG structure.
	$effect(() => {
		const { active, releaseMs, fadeMs, strength, sink, seamBlur } = blend
		void blob
		void meltHost
		if (!live) return
		live.active = active
		live.releaseMs = releaseMs
		live.fadeMs = fadeMs
		live.strength = strength
		live.sink = sink
		live.seamBlur = seamBlur
		ctx.engine.wake()
	})
</script>

<span {...rest} bind:this={host} style="display: contents;{style ? ` ${style}` : ''}">{@render children?.()}</span>
