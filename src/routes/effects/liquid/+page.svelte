<script lang="ts">
	import { Liquid, LiquidItem } from '$lib/effects/liquid/exports.js'

	const ACTIONS = [
		{ label: 'New file', x: -54, y: -34, icon: '📄' },
		{ label: 'Add image', x: 0, y: -64, icon: '🖼' },
		{ label: 'New folder', x: 54, y: -34, icon: '📁' }
	]

	let open = $state(true)
	let wide = $state(false)

	// Move: a thumb the page slides back and forth with a CSS transition.
	let thumb = $state(0)

	// Bend: a card dragged by pointer (and nudged on a timer for the demo).
	let pos = $state({ x: 40, y: 60 })
	let drag: { dx: number; dy: number } | null = $state(null)

	// Melt: two photo cards that drift into each other.
	let meltX = $state(0)

	$effect(() => {
		let t = 0
		const id = setInterval(() => {
			t++
			thumb = t % 2 ? 180 : 0
			if (!drag) pos = { x: t % 2 ? 200 : 40, y: t % 2 ? 40 : 90 }
			meltX = t % 2 ? 60 : 0
		}, 900)
		return () => clearInterval(id)
	})

	function down(e: PointerEvent) {
		;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
		drag = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
	}
	function moving(e: PointerEvent) {
		if (drag) pos = { x: e.clientX - drag.dx, y: e.clientY - drag.dy }
	}
	function up() {
		drag = null
	}

	const photo = (a: string, b: string) =>
		'data:image/svg+xml;utf8,' +
		encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="70" cy="80" r="36" fill="#fff" opacity=".5"/></svg>`
		)
	const photoA = photo('#ff7a59', '#ffd23f')
	const photoB = photo('#3a86ff', '#8338ec')
</script>

<main>
	<h1>Liquid</h1>

	<section>
		<h2>Morph — plus menu</h2>
		<Liquid fill="#202020" shadow="0 2px 6px rgba(0,0,0,.08)" style="width: 200px; height: 140px">
			{#each ACTIONS as a, i (a.label)}
				<Liquid.Item
					style="position: absolute; left: 80px; top: 80px"
					x={open ? a.x : 0}
					y={open ? a.y : 0}
					transition="bouncy"
					delay={i * 40}>
					<button class="round-btn" aria-label={a.label} tabindex={open ? 0 : -1}>{a.icon}</button>
				</Liquid.Item>
			{/each}
			<Liquid.Item style="position: absolute; left: 80px; top: 80px">
				<button
					class="round-btn"
					aria-expanded={open}
					aria-label={open ? 'Close menu' : 'Open menu'}
					onclick={() => (open = !open)}>+</button>
			</Liquid.Item>
		</Liquid>
	</section>

	<section>
		<h2>Morph — shape change</h2>
		<Liquid
			fill="#fff"
			shadow="0 4px 16px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.8)"
			style="height: 140px">
			<LiquidItem morph={{ shape: true }}>
				<button class="panel" class:wide onclick={() => (wide = !wide)}>{wide ? 'Panel open' : 'Open'}</button>
			</LiquidItem>
		</Liquid>
	</section>

	<section>
		<h2>Move — slider thumb</h2>
		<Liquid fill="#525252" style="width: 240px; height: 80px">
			<div class="track" aria-hidden="true"></div>
			<Liquid.Item effect="move" move={{ stretch: 0.6, trail: 0.35 }}>
				<div class="thumb" style:transform="translateX({thumb}px)"></div>
			</Liquid.Item>
		</Liquid>
	</section>

	<section>
		<h2>Bend — drag the card</h2>
		<Liquid fill="#202020" style="height: 210px; width: 420px">
			<Liquid.Item effect="bend">
				<div
					class="card"
					role="button"
					tabindex="0"
					style:transform="translate({pos.x}px, {pos.y}px)"
					style:transition={drag ? 'none' : undefined}
					onpointerdown={down}
					onpointermove={moving}
					onpointerup={up}>
					Gooey Project
				</div>
			</Liquid.Item>
		</Liquid>
	</section>

	<section>
		<h2>Melt — two photos</h2>
		<Liquid style="width: 420px; height: 200px">
			<Liquid.Item effect="melt">
				<img src={photoA} alt="" class="melt" style:left="{100 + meltX}px" style:top="60px" />
			</Liquid.Item>
			<Liquid.Item effect="melt">
				<img src={photoB} alt="" class="melt" style:left="{240 - meltX}px" style:top="60px" />
			</Liquid.Item>
		</Liquid>
	</section>
</main>

<style>
	main {
		padding: 16px;
		font-family: system-ui, sans-serif;
		background: #111;
		color: #eee;
		min-height: 100vh;
		display: grid;
		gap: 24px;
	}
	section {
		max-width: 100%;
		overflow: hidden;
	}
	h2 {
		font-size: 14px;
		font-weight: 500;
		opacity: 0.7;
	}
	.round-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: transparent;
		border: 0;
		color: #fff;
		font-size: 18px;
		cursor: pointer;
	}
	.panel {
		display: block;
		width: 96px;
		height: 44px;
		border-radius: 22px;
		border: 0;
		background: transparent;
		color: #111;
		font: inherit;
		cursor: pointer;
		transition:
			width 0.45s cubic-bezier(0.3, 1.05, 0.4, 1),
			height 0.45s cubic-bezier(0.3, 1.05, 0.4, 1),
			border-radius 0.45s;
	}
	.panel.wide {
		width: 240px;
		height: 120px;
		border-radius: 18px;
	}
	.track {
		position: absolute;
		left: 20px;
		right: 20px;
		top: 38px;
		height: 4px;
		border-radius: 2px;
		background: #333;
		z-index: -2;
	}
	.thumb {
		position: absolute;
		left: 20px;
		top: 20px;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		transition: transform 0.5s cubic-bezier(0.5, 0, 0.2, 1);
	}
	.card {
		position: absolute;
		left: 0;
		top: 0;
		width: 160px;
		height: 56px;
		border-radius: 28px;
		display: grid;
		place-items: center;
		color: #fff;
		cursor: grab;
		touch-action: none;
		user-select: none;
		transition: transform 0.6s cubic-bezier(0.5, 0, 0.2, 1);
	}
	.melt {
		position: absolute;
		width: 84px;
		height: 84px;
		border-radius: 16px;
		transition:
			left 0.8s ease-in-out,
			top 0.8s ease-in-out;
	}
</style>
