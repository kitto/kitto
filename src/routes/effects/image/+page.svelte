<script lang="ts">
	import { ImageGeneration, type ImageGenerationPreset } from '$lib/effects/image/index.js'

	const images = ['/effects/image/gen_1.jpg', '/effects/image/gen_2.jpg', '/effects/image/gen_3.jpg']
	const presets: ImageGenerationPreset[] = ['pixels-organic', 'pixels-mechanic', 'sweep-gradient']

	let preset: ImageGenerationPreset = $state('pixels-mechanic')
	let strength = $state(1)
	let paused = $state(false)
	let theme: 'dark' | 'light' = $state('dark')
	let fx: ImageGeneration | undefined = $state()
	let active = $state(false)
</script>

<main data-theme={theme}>
	<h1>ImageGeneration</h1>

	<p>
		Theme:
		<button onclick={() => (theme = 'dark')} aria-pressed={theme === 'dark'}>dark</button>
		<button onclick={() => (theme = 'light')} aria-pressed={theme === 'light'}>light</button>
	</p>

	<h2>Presets</h2>
	<div class="row">
		{#each presets as p (p)}
			<figure>
				<ImageGeneration preset={p} {theme} role="img" aria-label="Generating image">
					<div class="card"></div>
				</ImageGeneration>
				<figcaption>{p}</figcaption>
			</figure>
		{/each}
	</div>

	<h2>Playground</h2>
	<p>
		{#each presets as p (p)}
			<button onclick={() => (preset = p)} aria-pressed={preset === p}>{p}</button>
		{/each}
	</p>
	<p>
		<label>
			Strength {Math.round(strength * 100)}%
			<input type="range" min="0" max="1" step="0.01" bind:value={strength} />
		</label>
		<button onclick={() => (paused = !paused)}>{paused ? 'Play' : 'Pause'}</button>
		<button
			onclick={() => {
				if (fx?.isImageActive()) fx.triggerHide()
				else fx?.triggerReveal({ hold: 'manual' })
			}}>{active ? 'Hide image' : 'Reveal image'}</button>
		<button onclick={() => fx?.triggerRegenerate({ durationMs: 3000 })} disabled={!active}>Regenerate</button>
	</p>
	<ImageGeneration
		bind:this={fx}
		{preset}
		{theme}
		{strength}
		{paused}
		{images}
		onCycle={() => (active = fx?.isImageActive() ?? false)}>
		<div class="card large"></div>
	</ImageGeneration>

	<h2>Auto reveal</h2>
	<div class="row">
		{#each presets as p, i (p)}
			<ImageGeneration preset={p} {theme} {images} autoReveal revealInitialDelay={i * 0.5}>
				<div class="card"></div>
			</ImageGeneration>
		{/each}
	</div>
</main>

<style>
	main {
		padding: 16px;
		font-family: system-ui, sans-serif;
		min-height: 100vh;
		background: #1a1a1a;
		color: #eee;
	}

	main[data-theme='light'] {
		background: #f4f4f4;
		color: #111;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
	}

	figure {
		margin: 0;
	}

	figcaption {
		font-size: 13px;
		margin-top: 6px;
	}

	.card {
		width: 220px;
		height: 220px;
		border-radius: 20px;
	}

	.large {
		width: 320px;
		height: 320px;
	}
</style>
