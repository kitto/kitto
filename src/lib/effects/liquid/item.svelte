<!--
	@component
	One piece of a `<Liquid>` group. Mirrors its child's geometry into the
	group's liquid layer; see `Liquid` for the full docs.
-->
<script lang="ts">
	import type { LiquidItemProps } from './types.js'
	import MeltItem from './melt_item.svelte'
	import MirroredItem from './mirrored_item.svelte'
	import ObservedItem from './observed_item.svelte'
	import { get_gooey_context } from './context.js'
	import { IMAGE_MELT_DEFAULTS } from './image_melt.js'
	import { resolveItem } from './tuning.js'

	let {
		effect: liquidEffect = 'morph',
		morph,
		move,
		bend,
		melt,
		dissolve,
		observe,
		x,
		y,
		scale,
		transition,
		delay,
		radius,
		children,
		...rest
	}: LiquidItemProps = $props()

	const ctx = get_gooey_context()

	const resolved = $derived(
		liquidEffect === 'melt' ? null : resolveItem({ effect: liquidEffect, morph, move, bend, dissolve, observe })
	)
	const needsEngine = $derived(!!resolved && (resolved.observe || resolved.effect.some(e => e !== 'morph')))

	const meltSrc = $derived(melt?.src)
	const meltOpts = $derived.by(() => {
		const { src: _src, ...tuning } = melt ?? {}
		void _src
		return { ...IMAGE_MELT_DEFAULTS, ...tuning }
	})

	$effect(() => {
		if (liquidEffect === 'move' && dissolve !== undefined && dissolve !== false) {
			console.warn(
				'[liquid-gooey] `dissolve` is ignored with effect="move": the melt ' +
					'follows the element while the liquid lags on its spring, so the two ' +
					'would visibly disagree. Use it on a morph item.'
			)
		}
	})
</script>

{#if !resolved}
	<MeltItem {...rest} src={meltSrc} opts={meltOpts} registry={ctx.imageMelt}>{@render children?.()}</MeltItem>
{:else if needsEngine}
	<ObservedItem
		{...rest}
		{ctx}
		{radius}
		effect={resolved.effect}
		evolve={resolved.evolve}
		move={resolved.move}
		contactBlur={resolved.contactBlur}
		blobInset={resolved.blobInset}
		bridgeGrow={resolved.bridgeGrow}>
		{@render children?.()}
	</ObservedItem>
{:else}
	<MirroredItem {...rest} {ctx} {x} {y} {scale} {transition} {delay} {radius}>
		{@render children?.()}
	</MirroredItem>
{/if}
