<script lang="ts">
	import {
		BotAvatar,
		botAvatarTypes,
		botAvatarStates,
		type BotAvatarShading,
		type BotAvatarState
	} from '$lib/effects/bot_avatar/exports.js'

	const shadings: BotAvatarShading[] = ['plastic', 'crisp', 'smooth', 'flat']
	let state: BotAvatarState = $state('default')
</script>

<main data-theme="dark">
	<h1>BotAvatar</h1>

	<p>
		State:
		{#each botAvatarStates as s (s)}
			<button onclick={() => (state = s)} aria-pressed={state === s}>{s}</button>
		{/each}
	</p>

	<h2>Types</h2>
	<div class="row">
		{#each botAvatarTypes as type, i (type)}
			<BotAvatar {type} {state} seed={i / 18} />
		{/each}
	</div>

	<h2>States</h2>
	<div class="row">
		{#each botAvatarStates as s (s)}
			<figure>
				<BotAvatar type="clover" state={s} size={96} face="mouth" />
				<figcaption>{s}</figcaption>
			</figure>
		{/each}
	</div>

	<h2>Shading</h2>
	<div class="row">
		{#each shadings as shading (shading)}
			<figure>
				<BotAvatar type="square" {shading} {state} size={80} />
				<figcaption>{shading}</figcaption>
			</figure>
		{/each}
	</div>

	<h2>Colour</h2>
	<div class="row">
		<BotAvatar type="blob" color="#ff5c8a" {state} size={80} />
		<BotAvatar type="clover" color="#111" {state} size={80} />
		<BotAvatar type="star" ink="#4D7CFF" {state} size={80} />
		<BotAvatar type="drop" brightness={1.25} {state} size={80} />
		<BotAvatar type="drop" saturation={0.7} {state} size={80} />
		<BotAvatar type="cat" whirl={1} state="working" size={80} />
		<BotAvatar type="ghost" paused size={80} />
	</div>
</main>

<style>
	main {
		min-height: 100vh;
		padding: 32px;
		background: #111018;
		color: #eee;
		font-family: system-ui, sans-serif;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 32px;
		padding: 16px 0;
	}
	figure {
		display: grid;
		justify-items: center;
		gap: 12px;
		margin: 0;
	}
	button[aria-pressed='true'] {
		font-weight: bold;
	}
</style>
