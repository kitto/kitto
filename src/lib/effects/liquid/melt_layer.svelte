<!--
	Rendered by the Gooey group: watches the registered melt items and draws
	the pair. rAF-measured; re-renders only when a rect actually moves.
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import MeltPair from './melt_pair.svelte'
	import { geomKey, readGeom, type CardGeom, type ImageMeltRegistry } from './image_melt.js'

	interface Props {
		registry: ImageMeltRegistry
		getGroup: () => HTMLElement | null
	}

	let { registry, getGroup }: Props = $props()

	let version = $state(0)
	let geoms = $state.raw<{ a: CardGeom; b: CardGeom } | null>(null)
	let key = ''

	$effect(() => {
		const off = registry.subscribe(() => version++)
		// Items register in their own effects, which can run before this one.
		untrack(() => version++)
		return off
	})

	const pair = $derived.by(() => {
		void version
		return registry.entries().slice(0, 2)
	})
	const active = $derived(pair.length === 2)
	const elA = $derived(pair[0]?.el)
	const elB = $derived(pair[1]?.el)

	$effect(() => {
		const a = elA
		const b = elB
		if (!active || !a || !b) {
			geoms = null
			key = ''
			return
		}
		let raf = 0
		const tick = () => {
			const group = getGroup()
			if (group) {
				const ga = readGeom(group, a)
				const gb = readGeom(group, b)
				const next = geomKey(ga) + '|' + geomKey(gb)
				if (next !== key) {
					key = next
					geoms = { a: ga, b: gb }
				}
			}
			raf = requestAnimationFrame(tick)
		}
		raf = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(raf)
	})

	const size = $derived.by(() => {
		void geoms
		const group = getGroup()
		return { w: group?.offsetWidth ?? 0, h: group?.offsetHeight ?? 0 }
	})
</script>

{#if active && geoms && pair[0] && pair[1]}
	<MeltPair
		a={geoms.a}
		b={geoms.b}
		srcA={pair[0].src}
		srcB={pair[1].src}
		opts={pair[0].opts}
		width={size.w}
		height={size.h} />
{/if}
