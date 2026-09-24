<svelte:options namespace="svg" />

<!--
	The goo filter chain: blur → alpha contrast → atop the source, optional
	boundary undulation, then the SVG half of the shadow stack (spread rings
	and inset layers) built from the merged silhouette.
-->
<script lang="ts">
	import type { ShadowLayer } from './shadow.js'
	import { BINARIZE, gooIntercept } from './filter.js'

	interface Props {
		blur: number
		contrast: number
		shadows: ShadowLayer[]
		/** Max px the liquid boundary undulates. 0 (default) = calm geometric edge. */
		waviness?: number
		/** Noise frequency of the undulation — lower = longer, lazier waves. */
		wavinessFreq?: number
	}

	let { blur, contrast, shadows, waviness = 0, wavinessFreq = 0.018 }: Props = $props()

	const wavy = $derived(waviness > 0)
	// Intercept tracks the slope so the alpha threshold stays near the same
	// crossing as the classic 18/-7 goo pairing.
	const intercept = $derived(gooIntercept(contrast))
	const needsBin = $derived(shadows.some(s => s.inset || s.spread !== 0))
	const outerOrder = $derived(
		shadows
			.map((s, i) => (!s.inset ? i : -1))
			.filter(i => i >= 0)
			.reverse()
	)
</script>

<!--
	CSS inset emulation on the LIQUID: paint the colour where the silhouette
	is NOT covered by a shrunk/offset/blurred copy of itself, clipped back to
	the silhouette — an inner ring (spread), inner edge line (offset) or soft
	inner shadow (blur) that follows the merged goo through every state.
	`bin` is computed once for the whole stack. Erode by the SPREAD only: an
	offset-only inset must leave a 1px strip along one edge and nothing else.
-->
{#snippet inset_pass(i: number, s: ShadowLayer)}
	{@const er = s.spread !== 0}
	{@const off = s.x !== 0 || s.y !== 0}
	{@const bl = s.blur > 0}
	{@const afterEr = er ? `s${i}-er` : 'bin'}
	{@const afterOff = off ? `s${i}-o` : afterEr}
	{@const afterBl = bl ? `s${i}-b` : afterOff}
	{#if er}
		<feMorphology
			in="bin"
			operator={s.spread > 0 ? 'erode' : 'dilate'}
			radius={Math.abs(s.spread)}
			result="s{i}-er" />
	{/if}
	{#if off}
		<feOffset in={afterEr} dx={s.x} dy={s.y} result="s{i}-o" />
	{/if}
	{#if bl}
		<feGaussianBlur in={afterOff} stdDeviation={s.blur / 2} result="s{i}-b" />
	{/if}
	<!-- The band: silhouette minus its shrunk/offset self. -->
	<feComposite in="bin" in2={afterBl} operator="out" result="s{i}-band" />
	<feFlood flood-color={s.color} result="s{i}-c" />
	<feComposite in="s{i}-c" in2="s{i}-band" operator="in" result="s{i}" />
{/snippet}

{#snippet shadow_pass(i: number, s: ShadowLayer)}
	{@const sp = s.spread !== 0}
	{@const bl = s.blur > 0}
	{@const off = s.x !== 0 || s.y !== 0}
	{@const afterSp = sp ? `s${i}-sp` : 'shape'}
	{@const afterBl = bl ? `s${i}-b` : afterSp}
	{@const afterOff = off ? `s${i}-o` : afterBl}
	{#if sp}
		<feMorphology
			in="bin"
			operator={s.spread > 0 ? 'dilate' : 'erode'}
			radius={Math.abs(s.spread)}
			result="s{i}-sp" />
	{/if}
	{#if bl}
		<feGaussianBlur in={afterSp} stdDeviation={s.blur / 2} result="s{i}-b" />
	{/if}
	{#if off}
		<feOffset in={afterBl} dx={s.x} dy={s.y} result="s{i}-o" />
	{/if}
	<feFlood flood-color={s.color} result="s{i}-c" />
	<feComposite in="s{i}-c" in2={afterOff} operator="in" result="s{i}" />
{/snippet}

<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
<feColorMatrix
	in="blur"
	type="matrix"
	values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 {contrast} {intercept}"
	result="goo" />
<feComposite in="SourceGraphic" in2="goo" operator="atop" result={wavy ? 'shape-raw' : 'shape'} />
<!--
	The liquid boundary itself undulates: the whole silhouette — edges, neck,
	shadow source — runs through one gentle displacement field, so the surface
	reads as fluid even at rest. Shadows consume the displaced 'shape', so they
	hug the wavy edge exactly.
-->
{#if wavy}
	<feTurbulence type="fractalNoise" baseFrequency={wavinessFreq} numOctaves={2} seed="7" result="wave-noise" />
	<feDisplacementMap
		in="shape-raw"
		in2="wave-noise"
		scale={waviness * 2}
		xChannelSelector="R"
		yChannelSelector="G"
		result="shape" />
{/if}
<!-- Binarized silhouette, computed ONCE and shared by every pass that needs it. -->
{#if needsBin}
	<feColorMatrix in="shape" type="matrix" values={BINARIZE} result="bin" />
{/if}
{#each shadows as s, i (i)}
	{#if s.inset}
		{@render inset_pass(i, s)}
	{:else}
		{@render shadow_pass(i, s)}
	{/if}
{/each}
{#if shadows.length > 0}
	<feMerge>
		<!-- CSS paints the first shadow of the list on top: outer passes merge in
			reverse (among themselves) BELOW the shape; inset passes paint ABOVE
			it — they live inside the liquid edge. -->
		{#each outerOrder as i (i)}
			<feMergeNode in="s{i}" />
		{/each}
		<feMergeNode in="shape" />
		{#each shadows as s, i (i)}
			{#if s.inset}
				<feMergeNode in="s{i}" />
			{/if}
		{/each}
	</feMerge>
{/if}
