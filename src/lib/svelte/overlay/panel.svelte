<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion'
	import { slide } from 'svelte/transition'
	import { clampPosition, type Settings, type Source } from './model.js'
	interface Props {
		settings: Settings
		size: { width: number; height: number }
		sources: Source[]
		active?: Source
		offset: { x: number; y: number }
		innerWidth: number
		innerHeight: number
		error: string
		setOffset: (x: number, y: number) => void
		resetAll: () => void
	}
	let {
		settings = $bindable(),
		size,
		sources,
		active,
		offset,
		innerWidth,
		innerHeight,
		error,
		setOffset,
		resetAll
	}: Props = $props()
	let step = $state(1)
	let showShortcuts = $state(false)
	let launcher: HTMLButtonElement
	let panel: HTMLDivElement
	let dragging = $state(false)
	let pointer: { id: number; x: number; y: number; originX: number; originY: number } | null = null
	let suppressClick = false
	const id = $props.id()

	function move(x: number, y: number) {
		const position = clampPosition({ x, y }, { width: innerWidth, height: innerHeight }, size)
		settings.position = position
	}

	function pointerdown(event: PointerEvent) {
		if (event.button !== 0 || !event.isPrimary) return
		const rect = panel.getBoundingClientRect()
		pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: rect.x, originY: rect.y }
		suppressClick = false
		launcher.setPointerCapture(event.pointerId)
	}

	function pointermove(event: PointerEvent) {
		if (!pointer || pointer.id !== event.pointerId) return
		const dx = event.clientX - pointer.x
		const dy = event.clientY - pointer.y
		if (!dragging && Math.hypot(dx, dy) < 4) return
		dragging = true
		suppressClick = true
		move(pointer.originX + dx, pointer.originY + dy)
	}

	function pointerend(event: PointerEvent) {
		if (!pointer || pointer.id !== event.pointerId) return
		pointer = null
		dragging = false
		launcher.releasePointerCapture(event.pointerId)
	}

	function headerKeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
		if (event.code === 'Home') {
			event.preventDefault()
			settings.position = null
		} else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
			event.preventDefault()
			const rect = panel.getBoundingClientRect()
			move(
				rect.x + (event.code === 'ArrowRight' ? 10 : event.code === 'ArrowLeft' ? -10 : 0),
				rect.y + (event.code === 'ArrowDown' ? 10 : event.code === 'ArrowUp' ? -10 : 0)
			)
		}
	}
	// Milieu's cubic-bezier(0.175, 0.885, 0.32, 1.1), expressed for Svelte transitions.
	function milieuEase(t: number) {
		if (t === 0 || t === 1) return t
		const curve = (u: number, a: number, b: number) =>
			3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u ** 2 * b + u ** 3
		let low = 0
		let high = 1
		for (let i = 0; i < 16; i++) {
			const mid = (low + high) / 2
			if (curve(mid, 0.175, 0.32) < t) low = mid
			else high = mid
		}
		return curve((low + high) / 2, 0.885, 1.1)
	}

	function setAxis(axis: 'x' | 'y', value: number | undefined) {
		if (value !== undefined) setOffset(axis === 'x' ? value : offset.x, axis === 'y' ? value : offset.y)
	}
</script>

<div class="tool" bind:this={panel}>
	<button
		class="launcher"
		class:dragging
		bind:this={launcher}
		title="Drag to move. When focused, use arrow keys to move or Home to reset position."
		aria-expanded={settings.expanded}
		aria-controls={id}
		onpointerdown={pointerdown}
		onpointermove={pointermove}
		onpointerup={pointerend}
		onpointercancel={pointerend}
		onlostpointercapture={() => {
			pointer = null
			dragging = false
		}}
		onkeydown={headerKeydown}
		onclick={event => {
			if (suppressClick && event.detail !== 0) {
				suppressClick = false
				return
			}
			settings.expanded = !settings.expanded
		}}>
		<span class:enabled={settings.visible} class="dot"></span>
		<strong>Overlay</strong><span class="measure">{innerWidth} × {innerHeight}</span><span aria-hidden="true"
			>{settings.expanded ? '−' : '+'}</span>
	</button>
	{#if settings.expanded}
		<section
			{id}
			aria-label="Design Overlay Controls"
			transition:slide={{ duration: prefersReducedMotion.current ? 0 : 200, easing: milieuEase }}>
			<div class="row source-row">
				<select aria-label="Source" bind:value={settings.selection} disabled={!active}>
					<option value="auto">Auto{active ? ` · ${active.width}w` : ''}</option>
					{#each sources as source (source.id)}
						<option value={source.id}>{source.width}w · {source.src}</option>
					{/each}
				</select>
				<button
					class="visibility-switch"
					role="switch"
					aria-label="Show Overlay Image"
					aria-checked={settings.visible}
					title="Show Overlay Image"
					disabled={!active}
					onclick={() => (settings.visible = !settings.visible)}>
					<span aria-hidden="true"></span>
				</button>
			</div>
			<label class="field" for="{id}-opacity"
				><span class="row">Opacity <output class="measure">{settings.opacity}%</output></span>
				<input
					id="{id}-opacity"
					type="range"
					min="0"
					max="100"
					step="1"
					style:--progress="{settings.opacity}%"
					bind:value={settings.opacity}
					disabled={!active} />
			</label>
			<div class="offsets">
				{#each ['x', 'y'] as const as axis (axis)}
					<label class="field">
						{axis.toUpperCase()} Offset
						<span class="input-unit">
							<input
								aria-label="{axis.toUpperCase()} Offset"
								type="number"
								{step}
								bind:value={() => offset[axis], value => setAxis(axis, value)}
								disabled={!active} /><span>px</span>
						</span>
					</label>
				{/each}
				<label class="field">
					Step
					<select aria-label="Offset Step" bind:value={step} disabled={!active}>
						<option value={1}>1px</option>
						<option value={10}>10px</option>
					</select>
				</label>
			</div>
			<div class="row resets">
				<button
					onclick={() => {
						resetAll()
						step = 1
						showShortcuts = false
						launcher?.focus()
					}}>Reset</button>
				<button
					class="help-button"
					aria-label="Keyboard Shortcuts"
					title="Keyboard Shortcuts"
					aria-expanded={showShortcuts}
					aria-controls="{id}-shortcuts"
					onclick={() => {
						showShortcuts = !showShortcuts
					}}>
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<rect x="2" y="5" width="20" height="14" rx="2" />
						<path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10" />
					</svg>
				</button>
			</div>
			{#if error}<p class="error" role="status">{error}</p>{/if}
			{#if showShortcuts}
				<p
					id="{id}-shortcuts"
					class="shortcuts"
					transition:slide={{ duration: prefersReducedMotion.current ? 0 : 200, easing: milieuEase }}>
					1–9: opacity · 0: 100% · 00: hide<br />Shift + arrows: 10px · Ctrl + Shift: 1px<br />Shift + Alt +
					↑: reset X/Y<br />Shift + ↑ and ↓ together: reset X/Y
				</p>
			{/if}
		</section>
	{:else if error}
		<span class="error-badge" role="status">{active ? 'Image failed to load' : 'Check overlay sources'}</span>
	{/if}
</div>

<style>
	.tool {
		/* Milieu light tokens; kept local so host-page themes cannot override the system preference. */
		--surface: #ffffff;
		--control: #ffffff;
		--line: #00000014;
		--line-hover: #00000036;
		--line-active: #0000003d;
		--text: #171717;
		--muted: #4d4d4d;
		--accent: hsl(215, 100%, 60%);
		--accent-hover: color-mix(in srgb, var(--accent) 90%, #000000);
		--focus: var(--accent);
		--help-surface: #f0f7ff;
		--hover: #ebebeb;
		--active: #e6e6e6;
		--disabled-surface: #f2f2f2;
		--disabled-text: #8f8f8f;
		--error: #d8001b;
		--thumb: #ffffff;
		--control-radius: 10px;
		--select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='m3 4.5 3 3 3-3' fill='none' stroke='%234d4d4d' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		--font-ui: 'Geist', 'Geist Sans', system-ui, sans-serif;
		--font-mono: 'Geist Mono', ui-monospace, monospace;
		all: initial;
		box-sizing: border-box;
		display: block;
		width: 300px;
		max-width: calc(100vw - 24px);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface) 85%, transparent);
		-webkit-backdrop-filter: blur(20px);
		backdrop-filter: blur(20px);
		color: var(--text);
		box-shadow:
			0 1px 1px #00000005,
			0 4px 8px -4px #0000000a,
			0 16px 24px -8px #0000000f;
		color-scheme: light;
		font: 400 12px/16px var(--font-ui);
	}
	.tool :where(button, input, select, label, span, strong, section, div, p, output) {
		all: revert;
		box-sizing: border-box;
		font: inherit;
		color: inherit;
		letter-spacing: normal;
		text-transform: none;
	}
	.tool :is(button, select, input) {
		margin: 0;
		border: 1px solid var(--line);
		border-radius: var(--control-radius);
		background: var(--control);
		padding: 0 8px;
		height: 32px;
		font: 400 14px/20px var(--font-ui);
		min-width: 0;
		box-shadow: none;
	}
	.tool button {
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
		text-align: center;
		font-weight: 500;
	}
	.tool button:hover {
		background: var(--hover);
		border-color: var(--line-hover);
	}
	.tool button:active {
		background: var(--active);
		border-color: var(--line-active);
	}
	.tool select:hover,
	.tool .input-unit:hover {
		border-color: var(--line-hover);
	}
	.tool :is(button, input, select):disabled {
		background-color: var(--disabled-surface);
		color: var(--disabled-text);
		cursor: not-allowed;
	}
	.tool :is(button, input, select):focus-visible {
		outline: 2px solid transparent;
		outline-offset: 2px;
		box-shadow:
			0 0 0 2px var(--surface),
			0 0 0 4px var(--focus);
	}
	.tool .launcher {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 12px 16px;
		height: auto;
		font: 400 12px/16px var(--font-ui);
		border: 0;
		border-radius: 0;
		background: transparent;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.tool .launcher.dragging {
		cursor: grabbing;
	}
	.tool .launcher strong {
		font: 500 14px/20px var(--font-ui);
	}
	.tool .launcher:focus-visible {
		box-shadow:
			inset 0 0 0 2px var(--surface),
			inset 0 0 0 4px var(--focus);
	}
	.tool .launcher .measure {
		margin-left: auto;
		color: var(--muted);
	}
	.tool .dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--disabled-text);
		flex-shrink: 0;
	}
	.tool .dot.enabled {
		background: var(--accent);
	}
	.tool section {
		display: grid;
		gap: 16px;
		padding: 16px;
		border-top: 1px solid var(--line);
		max-height: calc(100dvh - 90px);
		overflow: auto;
	}
	.tool .row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.tool .measure,
	.tool input[type='number'],
	.tool .input-unit > span {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.tool .source-row select {
		flex: 1;
	}
	.tool .visibility-switch {
		display: flex;
		align-items: center;
		flex: 0 0 40px;
		width: 40px;
		height: 24px;
		padding: 3px;
		border-radius: 999px;
	}
	.tool .visibility-switch span {
		display: block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--muted);
	}
	.tool .visibility-switch[aria-checked='true'] {
		border-color: var(--accent);
		background: var(--accent);
	}
	.tool .visibility-switch[aria-checked='true']:hover {
		background: var(--accent-hover);
	}
	.tool .visibility-switch[aria-checked='true'] span {
		translate: 16px 0;
		background: var(--thumb);
	}
	.tool .field {
		color: var(--muted);
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	.tool select {
		width: 100%;
		-webkit-appearance: none;
		appearance: none;
		background-image: var(--select-chevron);
		background-repeat: no-repeat;
		background-position: right 10px center;
		background-size: 12px;
		padding-right: 28px;
		color: var(--text);
		text-overflow: ellipsis;
	}
	.tool input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 20px;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}
	/* Draw the range ourselves: native accent-color can be lightened by the OS. */
	.tool input[type='range']::-webkit-slider-runnable-track {
		height: 8px;
		border-radius: 999px;
		background: linear-gradient(to right, var(--accent) var(--progress), var(--line) var(--progress));
	}
	.tool input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 24px;
		height: 16px;
		margin-top: -4px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--thumb);
		box-shadow: 0 1px 2px #00000026;
	}
	.tool input[type='range']::-moz-range-track {
		height: 8px;
		border-radius: 999px;
		background: linear-gradient(to right, var(--accent) var(--progress), var(--line) var(--progress));
	}
	.tool input[type='range']::-moz-range-progress {
		background: transparent;
	}
	.tool input[type='range']::-moz-range-thumb {
		width: 24px;
		height: 16px;
		box-sizing: border-box;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--thumb);
		box-shadow: 0 1px 2px #00000026;
	}
	.tool .offsets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	.tool .input-unit {
		display: flex;
		align-items: center;
		border: 1px solid var(--line);
		border-radius: var(--control-radius);
		background: var(--control);
	}
	.tool .input-unit input {
		width: 100%;
		height: 30px;
		border: 0;
		background: transparent;
		color: var(--text);
	}
	.tool .input-unit > span {
		padding-right: 8px;
	}
	.tool .resets {
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.tool .error,
	.tool .error-badge {
		margin: 0;
		color: var(--error);
		overflow-wrap: anywhere;
	}
	.tool .error-badge {
		display: block;
		padding: 0 12px 10px;
	}
	.tool .help-button {
		display: grid;
		place-items: center;
		flex: 0 0 32px;
		width: 32px;
		padding: 0;
	}
	.tool .help-button svg {
		display: block;
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.tool .help-button[aria-expanded='true'] {
		background: var(--help-surface);
		border-color: var(--accent);
		color: var(--focus);
	}
	.tool .shortcuts {
		margin: 0;
		color: var(--muted);
		font: 400 13px/18px var(--font-ui);
	}
	@media (prefers-color-scheme: dark) {
		.tool {
			/* Milieu dark tokens use the same semantic roles. */
			--surface: #000000;
			--control: transparent;
			--line: #ffffff24;
			--line-hover: #ffffff3d;
			--line-active: #ffffff82;
			--text: #ededed;
			--muted: #a0a0a0;
			--help-surface: transparent;
			--hover: transparent;
			--active: transparent;
			--disabled-surface: transparent;
			--error: #ff565f;
			--select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='m3 4.5 3 3 3-3' fill='none' stroke='%23a0a0a0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
			color-scheme: dark;
		}
	}
</style>
