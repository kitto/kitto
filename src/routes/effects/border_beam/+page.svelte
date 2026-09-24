<script lang="ts">
	import {
		BorderBeam,
		type BorderBeamColorVariant,
		type BorderBeamSize
	} from '$lib/effects/border_beam/exports.js'

	const sizes: BorderBeamSize[] = ['md', 'line', 'sm', 'pulse-inner', 'pulse-outside']
	const variants: BorderBeamColorVariant[] = ['colorful', 'mono', 'ocean', 'sunset']
	let active = $state(true)
</script>

<main>
	<h1>BorderBeam</h1>
	<button class="toggle" onclick={() => (active = !active)}>{active ? 'Pause' : 'Play'}</button>

	{#each ['dark', 'light'] as const as theme (theme)}
		<section class="panel {theme}">
			{#each sizes as size (size)}
				<div class="cell">
					<BorderBeam {size} {theme} {active} style="width: fit-content">
						{#if size === 'sm'}
							<button class="chip">Generate</button>
						{:else}
							<div class="card">{size}</div>
						{/if}
					</BorderBeam>
				</div>
			{/each}
			{#each variants as colorVariant (colorVariant)}
				<div class="cell">
					<BorderBeam {colorVariant} {theme} {active} style="width: fit-content">
						<div class="card">{colorVariant}</div>
					</BorderBeam>
				</div>
			{/each}
		</section>
	{/each}
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		padding: 24px;
	}

	.toggle {
		margin-bottom: 16px;
	}

	.panel {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 48px 32px;
		padding: 48px 32px;
		border-radius: 12px;
		margin-bottom: 24px;
	}

	.cell {
		display: grid;
		place-items: center;
	}

	.dark {
		background: #0e0e0e;
		color: #eee;
	}

	.dark .card,
	.dark .chip {
		background: #1d1d1d;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: inherit;
	}

	.light {
		background: #f4f4f4;
		color: #222;
	}

	.light .card,
	.light .chip {
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.08);
		color: inherit;
	}

	.card {
		width: 220px;
		height: 96px;
		border-radius: 16px;
		display: grid;
		place-items: center;
		box-sizing: border-box;
	}

	.chip {
		border-radius: 18px;
		padding: 8px 18px;
		font: inherit;
	}
</style>
