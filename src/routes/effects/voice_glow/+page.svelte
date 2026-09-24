<script lang="ts">
	import { VoiceBeam, use_microphone, type VoiceBeamColorVariant } from '$lib/effects/voice_glow/exports.js'

	// A synthetic voice (the libraries.dev demo curve): syllables inside words inside phrases, with a pause.
	function demoLevel(t: number): number {
		const phrase = t % 9
		if (phrase > 6.6) return 0
		const syllable = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 3.1)
		const word = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.55 + 1)
		const rough = 0.86 + 0.14 * Math.sin(t * 23.7)
		const v = Math.pow(syllable, 1.6) * (0.5 + 0.5 * word) * rough
		return Math.min(1, v * 1.05)
	}

	const mic = use_microphone()
	const live = $derived(mic.state === 'live')
	const status: Record<string, string> = {
		idle: '',
		requesting: 'Waiting for permission…',
		live: 'Listening.',
		denied: "Microphone blocked — allow it in the browser's site settings.",
		unsupported: "This browser can't capture audio.",
		error: "Couldn't open the microphone."
	}

	let source = $state<'demo' | 'slider'>('slider')
	let manual = $state(0.7)
	let processing = $state(false)
	let paused = $state(false)

	// A getter, sampled once per frame by the driver: no re-render per frame.
	const level = () => (source === 'demo' ? demoLevel(performance.now() / 1000) : manual)

	const variants: VoiceBeamColorVariant[] = ['ocean', 'sunset', 'mono']
</script>

<main>
	<h1>VoiceBeam</h1>

	<div class="controls">
		<label><input type="radio" bind:group={source} value="slider" /> Slider</label>
		<label><input type="radio" bind:group={source} value="demo" /> Demo voice</label>
		<label>
			Level
			<input type="range" min="0" max="1" step="0.01" bind:value={manual} disabled={source !== 'slider'} />
			<output>{manual.toFixed(2)}</output>
		</label>
		<label><input type="checkbox" bind:checked={processing} /> Processing</label>
		<label><input type="checkbox" bind:checked={paused} /> Paused</label>
		<button onclick={live ? mic.stop : mic.start} aria-pressed={live}
			>{live ? 'Stop mic' : 'Use microphone'}</button>
		<span role="status">{status[mic.state]}</span>
	</div>

	<section class="panel dark">
		<div class="cell">
			<p>Chat input</p>
			<VoiceBeam stream={mic.stream} {level} {processing} {paused}>
				<div class="composer"><span>Ask anything</span></div>
			</VoiceBeam>
		</div>
		<div class="cell">
			<p>Processing</p>
			<VoiceBeam processing {paused}>
				<div class="composer"><span>Transcribing…</span></div>
			</VoiceBeam>
		</div>
		<div class="cell">
			<p>Pill</p>
			<VoiceBeam type="pill" stream={mic.stream} {level} {processing} {paused} style="width: fit-content">
				<div class="pill"><span>● Recording</span></div>
			</VoiceBeam>
		</div>
		{#each variants as colorVariant (colorVariant)}
			<div class="cell">
				<p>{colorVariant}</p>
				<VoiceBeam {colorVariant} stream={mic.stream} {level} {processing} {paused}>
					<div class="composer"><span>{colorVariant}</span></div>
				</VoiceBeam>
			</div>
		{/each}
		<div class="cell phone-cell">
			<p>Mobile</p>
			<VoiceBeam type="mobile" stream={mic.stream} {level} {processing} {paused} style="width: fit-content">
				<div class="phone"><span>Voice mode</span></div>
			</VoiceBeam>
		</div>
	</section>

	<section class="panel light">
		<div class="cell">
			<p>Light</p>
			<VoiceBeam theme="light" stream={mic.stream} {level} {processing} {paused}>
				<div class="composer"><span>Ask anything</span></div>
			</VoiceBeam>
		</div>
		<div class="cell">
			<p>Light processing</p>
			<VoiceBeam theme="light" processing {paused}>
				<div class="composer"><span>Thinking…</span></div>
			</VoiceBeam>
		</div>
	</section>
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		padding: 24px;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
		margin-bottom: 16px;
	}

	.panel {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 40px 32px;
		padding: 40px 32px;
		border-radius: 12px;
		margin-bottom: 24px;
	}

	.dark {
		background: #0b0b0c;
		color: #eee;
	}

	.light {
		background: #f4f4f5;
		color: #222;
	}

	.cell p {
		margin: 0 0 8px;
		font-size: 12px;
		opacity: 0.6;
	}

	.cell {
		width: 350px;
		max-width: 100%;
	}

	.composer {
		height: 110px;
		border-radius: 20px;
		padding: 18px 20px;
		box-sizing: border-box;
		background: #1d1d1d;
	}

	.light .composer {
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
	}

	.pill {
		width: 150px;
		height: 44px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		background: #1d1d1d;
		font-size: 13px;
	}

	.phone {
		width: 320px;
		height: 300px;
		border-radius: 36px;
		padding: 24px;
		box-sizing: border-box;
		background: #111;
	}

	.phone-cell {
		grid-row: span 2;
	}

	/* Content that must stay crisp sits above the glow layers. */
	span {
		position: relative;
		z-index: 5;
	}
</style>
