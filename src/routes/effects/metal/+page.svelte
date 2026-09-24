<script lang="ts">
	import {
		MetalFx,
		MetalText,
		MetalBadge,
		metal_bend,
		metal_text_reflection,
		type MetalFxPreset
	} from '$lib/effects/metal/exports.js'

	// Every metal instance shares one material, so the preset/theme is page-wide.
	let preset = $state<MetalFxPreset>('chromatic')
	let theme = $state<'dark' | 'light'>('dark')
	let paused = $state(false)

	let chip = $state<HTMLButtonElement | null>(null)
	let plan = $state<HTMLSpanElement | null>(null)
</script>

<main class={theme}>
	<h1>Metal</h1>
	<div class="controls">
		{#each ['chromatic', 'silver', 'gold'] as const as p (p)}
			<button onclick={() => (preset = p)} aria-pressed={preset === p}>{p}</button>
		{/each}
		<button onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}>theme: {theme}</button>
		<button onclick={() => (paused = !paused)}>{paused ? 'Play' : 'Pause'}</button>
	</div>

	<section>
		<h2>Button</h2>
		<MetalFx {preset} {theme} {paused}>
			<button class="cta">Upgrade to Pro</button>
		</MetalFx>
	</section>

	<section>
		<h2>Circle button (bend + reflection on the chip)</h2>
		<div class="composer">
			<button bind:this={chip} class="chip">Auto</button>
			<MetalFx
				variant="circle"
				{preset}
				{theme}
				{paused}
				innerShadow
				strength={0.9}
				reflectionTargets={[chip]}
				{@attach metal_bend()}>
				<button class="send" aria-label="Send">↑</button>
			</MetalFx>
		</div>
	</section>

	<section>
		<h2>Text</h2>
		<div class="plan">
			<span bind:this={plan} {@attach metal_text_reflection()}>Plan</span>
			<MetalText
				font="500 24px/1.2 Inter, sans-serif"
				color={theme === 'dark' ? '#E2E2E2' : '#1d1d1d'}
				{theme}
				strength={0.9}
				reflectionTargets={[{ ref: plan, strength: 0.64 }]}>
				Pro
			</MetalText>
		</div>
	</section>

	<section>
		<h2>Badge</h2>
		<div class="menu-item">
			<span>Live mode</span>
			<MetalBadge {theme} />
			<MetalBadge {theme} scale={1.6}>Beta</MetalBadge>
		</div>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
	}
	main {
		min-height: 100vh;
		padding: 32px;
		font-family: Inter, system-ui, sans-serif;
		display: grid;
		gap: 24px;
		align-content: start;
	}
	main.dark {
		background: #121212;
		color: #e2e2e2;
	}
	main.light {
		background: #f4f4f4;
		color: #1d1d1d;
	}
	h1 {
		margin: 0;
	}
	h2 {
		font-size: 13px;
		font-weight: 500;
		opacity: 0.6;
		margin: 0 0 12px;
	}
	.controls {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.cta {
		height: 40px;
		padding: 0 18px;
		border-radius: 999px;
		color: inherit;
		font:
			500 14px/1 Inter,
			system-ui,
			sans-serif;
		cursor: pointer;
	}
	.composer,
	.plan,
	.menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.chip {
		height: 32px;
		padding: 0 12px;
		border-radius: 999px;
		border: 1px solid #333;
		background: #1c1c1c;
		color: #ccc;
	}
	.light .chip {
		background: #fff;
		border-color: #ddd;
		color: #333;
	}
	.send {
		width: 40px;
		height: 40px;
		border-radius: 999px;
		color: inherit;
		font-size: 18px;
		cursor: pointer;
	}
	.plan span {
		font:
			500 24px/1.2 Inter,
			sans-serif;
		color: #8a8a8a;
	}
</style>
