<script lang="ts">
	import { ThinkingOrb, STATE_TO_MODE, type OrbState } from '$lib/effects/thinking_orb/exports.js'

	const states = Object.keys(STATE_TO_MODE) as OrbState[]
	let paused = $state(false)
</script>

<main>
	<h1>ThinkingOrb</h1>
	<button onclick={() => (paused = !paused)}>{paused ? 'Play' : 'Pause'}</button>

	<section class="panel dark" data-theme="dark">
		{#each states as state (state)}
			<figure>
				<ThinkingOrb {state} size={64} {paused} />
				<figcaption>
					<ThinkingOrb {state} size={20} {paused} aria-hidden="true" />
					{state}
				</figcaption>
			</figure>
		{/each}
	</section>

	<section class="panel light" data-theme="light">
		{#each states as state (state)}
			<figure>
				<ThinkingOrb {state} size={64} {paused} />
				<figcaption>
					<ThinkingOrb {state} size={32} {paused} aria-hidden="true" />
					{state}
				</figcaption>
			</figure>
		{/each}
	</section>

	<section class="panel dark" data-theme="dark">
		<figure>
			<ThinkingOrb state="working" color="#7cc4ff" {paused} />
			<figcaption>tint</figcaption>
		</figure>
		<figure>
			<ThinkingOrb state="searching" dots={2} {paused} />
			<figcaption>dots 2</figcaption>
		</figure>
		<figure>
			<ThinkingOrb state="connecting" dotSize={1.5} {paused} />
			<figcaption>dotSize 1.5</figcaption>
		</figure>
		<figure>
			<ThinkingOrb state="shaping" opts={{ shape: 1 }} {paused} />
			<figcaption>shape 1</figcaption>
		</figure>
		<figure>
			<ThinkingOrb state="composing" speed={0.4} {paused} />
			<figcaption>speed 0.4</figcaption>
		</figure>
	</section>
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		padding: 24px;
	}
	.panel {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		padding: 24px;
		margin-top: 16px;
		border-radius: 12px;
	}
	.dark {
		background: #111;
		color: #eee;
	}
	.light {
		background: #f4f4f2;
		color: #222;
	}
	figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	figcaption {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}
</style>
