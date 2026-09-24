<!--
	The melt SVG for one pair, rendered into the group. Pure function of the
	two geometries + sources + tuning; ids namespaced per instance.
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import { meltPairGeometry, meltProximity, type CardGeom, type ImageMeltOptions } from './image_melt.js'

	interface Props {
		a: CardGeom
		b: CardGeom
		srcA: string
		srcB: string
		opts: Required<ImageMeltOptions>
		width: number
		height: number
	}

	let { a, b, srcA, srcB, opts, width, height }: Props = $props()

	const id = $props.id()
	const uid = `lgm-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

	const proxTarget = $derived(meltProximity(a, b, opts.blur))

	// Exponential chase toward the target — the eased proximity that keeps the
	// melt growing in over ~200ms instead of popping at the goo threshold.
	const rate = 14
	let prox = $state(untrack(() => proxTarget))
	const st = { value: untrack(() => proxTarget), target: 0, raf: 0, last: 0 }
	$effect(() => {
		st.target = proxTarget
		if (st.raf) return
		st.last = performance.now()
		const tick = (now: number) => {
			const dt = Math.min(0.05, (now - st.last) / 1000)
			st.last = now
			const k = 1 - Math.exp(-rate * dt)
			st.value += (st.target - st.value) * k
			if (Math.abs(st.value - st.target) < 0.004) st.value = st.target
			prox = st.value
			st.raf = st.value === st.target ? 0 : requestAnimationFrame(tick)
		}
		st.raf = requestAnimationFrame(tick)
		return () => {
			if (st.raf) cancelAnimationFrame(st.raf)
			st.raf = 0
		}
	})

	const g = $derived(meltPairGeometry(a, b, opts, prox))
	const gA = $derived(`translate(${a.x}, ${a.y})`)
	const gB = $derived(`translate(${b.x}, ${b.y})`)
	const gooMatrix = $derived(`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${opts.contrast} ${g.intercept}`)
	const waveFreq = $derived((2 + opts.waviness * 1.2) / 1000)
	const seamRot = $derived(`rotate(${g.seamDeg}, ${g.seam.x}, ${g.seam.y})`)
</script>

<svg
	aria-hidden="true"
	focusable="false"
	data-gooey-imagemelt=""
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	style="position: absolute; inset: 0; overflow: visible; pointer-events: none">
	<defs>
		<!-- No x/y: the rects referencing these patterns already sit inside a
			translated <g>, and userSpaceOnUse resolves in that transformed
			space — an origin here shifted the tile a second time, so the
			image repeated instead of filling the card once. -->
		<pattern id="{uid}-pa" patternUnits="userSpaceOnUse" width={a.w} height={a.h}>
			<image href={srcA} width={a.w} height={a.h} preserveAspectRatio="xMidYMid slice" />
		</pattern>
		<pattern id="{uid}-pb" patternUnits="userSpaceOnUse" width={b.w} height={b.h}>
			<image href={srcB} width={b.w} height={b.h} preserveAspectRatio="xMidYMid slice" />
		</pattern>
		<!-- Goo on colour: blur mixes both images, contrast re-solidifies only
			alpha; colours come from a wider blur clipped into that shape, so
			internal edges average away while the boundary stays liquid. -->
		<filter id="{uid}-goo" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
			<feGaussianBlur in="SourceGraphic" stdDeviation={g.blurEff} result="b" />
			<feColorMatrix in="b" type="matrix" values={gooMatrix} result="goo" />
			<feGaussianBlur in="SourceGraphic" stdDeviation={g.colorBlur} result="bc" />
			<feComposite in="bc" in2="goo" operator="in" result="mix" />
			<feTurbulence type="fractalNoise" baseFrequency={waveFreq} numOctaves="2" seed="4" result="wn" />
			<feDisplacementMap
				in="mix"
				in2="wn"
				scale={g.warpEff}
				xChannelSelector="R"
				yChannelSelector="G"
				result="warped" />
			<!-- Solidify by self-compositing (premultiplied-safe), then restore
				the anti-aliased edge with a sub-pixel blur. -->
			<feComposite in="warped" in2="warped" operator="over" result="s1" />
			<feComposite in="s1" in2="s1" operator="over" result="s2" />
			<feComposite in="s2" in2="s2" operator="over" result="solid" />
			<feGaussianBlur in="solid" stdDeviation="0.6" />
		</filter>
		<filter id="{uid}-soft" x="-60%" y="-60%" width="220%" height="220%">
			<feGaussianBlur stdDeviation={opts.fade} />
		</filter>
		<!-- Marbling: nested large-scale displacements fold the molten colours
			into streaks, clipped to the goo silhouette. -->
		{#if g.mixAmt > 0.01}
			<filter id="{uid}-marble" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
				<feGaussianBlur in="SourceGraphic" stdDeviation={opts.mixBlur} result="c" />
				<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="5" result="n1" />
				<feDisplacementMap
					in="c"
					in2="n1"
					scale={g.mixAmt * 90}
					xChannelSelector="R"
					yChannelSelector="G"
					result="d1" />
				<feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="2" seed="11" result="n2" />
				<feDisplacementMap
					in="d1"
					in2="n2"
					scale={g.mixAmt * 50}
					xChannelSelector="R"
					yChannelSelector="G"
					result="d2" />
				<feComposite in="d2" in2="d2" operator="over" result="m1" />
				<feComposite in="m1" in2="m1" operator="over" result="m2" />
				<feGaussianBlur in="m2" stdDeviation="0.6" result="marble" />
				<feGaussianBlur in="SourceGraphic" stdDeviation={g.blurEff} result="mb" />
				<feColorMatrix in="mb" type="matrix" values={gooMatrix} result="mg" />
				<feTurbulence type="fractalNoise" baseFrequency={waveFreq} numOctaves="2" seed="4" result="mwn" />
				<feDisplacementMap
					in="mg"
					in2="mwn"
					scale={g.warpEff}
					xChannelSelector="R"
					yChannelSelector="G"
					result="mshape" />
				<feComposite in="marble" in2="mshape" operator="in" />
			</filter>
			<mask id="{uid}-marblemask" maskUnits="userSpaceOnUse" x="0" y="0" {width} {height}>
				<g filter="url(#{uid}-soft)">
					<ellipse
						cx={g.seam.x}
						cy={g.seam.y}
						rx={(g.rA + g.rB) / 2 + g.tanHalf}
						ry={((g.rA + g.rB) / 2) * opts.gravity}
						transform={seamRot}
						fill="#fff" />
				</g>
			</mask>
		{/if}
		<filter id="{uid}-edge" x="-40%" y="-40%" width="180%" height="180%">
			<feGaussianBlur stdDeviation={g.edgeSoft} />
		</filter>
		<!-- Crisp faces: each is its plain card minus a blurred seam-spanning
			erase ellipse — apart, a card is exactly a card. -->
		<mask id="{uid}-ma" maskUnits="userSpaceOnUse" x="0" y="0" {width} {height}>
			<g filter="url(#{uid}-edge)">
				<g transform={gA}>
					<rect width={a.w} height={a.h} rx={a.r} fill="#fff" />
				</g>
			</g>
			<g filter="url(#{uid}-soft)">
				<ellipse cx={g.seam.x} cy={g.seam.y} rx={g.rB + g.tanHalf} ry={g.rB} transform={seamRot} fill="#000" />
			</g>
		</mask>
		<mask id="{uid}-mb" maskUnits="userSpaceOnUse" x="0" y="0" {width} {height}>
			<g filter="url(#{uid}-edge)">
				<g transform={gB}>
					<rect width={b.w} height={b.h} rx={b.r} fill="#fff" />
				</g>
			</g>
			<g filter="url(#{uid}-soft)">
				<ellipse cx={g.seam.x} cy={g.seam.y} rx={g.rA + g.tanHalf} ry={g.rA} transform={seamRot} fill="#000" />
			</g>
		</mask>
	</defs>

	<!-- MOLTEN layer -->
	<g filter="url(#{uid}-goo)">
		<g transform={gA}><rect width={a.w} height={a.h} rx={a.r} fill="url(#{uid}-pa)" /></g>
		<g transform={gB}><rect width={b.w} height={b.h} rx={b.r} fill="url(#{uid}-pb)" /></g>
	</g>

	<!-- MARBLE layer -->
	{#if g.mixAmt > 0.01}
		<g mask="url(#{uid}-marblemask)">
			<g filter="url(#{uid}-marble)">
				<g transform={gA}><rect width={a.w} height={a.h} rx={a.r} fill="url(#{uid}-pa)" /></g>
				<g transform={gB}><rect width={b.w} height={b.h} rx={b.r} fill="url(#{uid}-pb)" /></g>
			</g>
		</g>
	{/if}

	<!-- CRISP layer -->
	<g mask="url(#{uid}-ma)">
		<g transform={gA}><rect width={a.w} height={a.h} rx={a.r} fill="url(#{uid}-pa)" /></g>
	</g>
	<g mask="url(#{uid}-mb)">
		<g transform={gB}><rect width={b.w} height={b.h} rx={b.r} fill="url(#{uid}-pb)" /></g>
	</g>
</svg>
