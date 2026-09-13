<script lang="ts">
	import { onMount } from 'svelte'
	import Panel from './panel.svelte'
	import { clampPosition, configure, defaults, restore, select, storageKey } from './model.js'

	interface Props {
		/** Comma-separated design URLs and intended CSS widths, e.g. "/desktop.jpg 1920w, /mobile.jpg 393w". The nearest width is selected automatically. */
		srcset?: string
		/** Legacy mobile image, used below 640px. Supports an @width suffix; defaults to 393px. */
		mobile?: string
		/** Legacy desktop image, used from 640px. Supports an @width suffix; defaults to 1920px. srcset takes precedence. */
		desktop?: string
	}

	let { srcset, mobile, desktop }: Props = $props()
	const configuration = $derived(configure(srcset, mobile, desktop))
	let ready = $state(false)
	let pathname = $state('')
	let innerWidth = $state(0)
	let innerHeight = $state(0)
	let scrollX = $state(0)
	let scrollY = $state(0)
	let settings = $state(defaults())
	let loadedKey = $state('')
	const key = $derived(storageKey(pathname, configuration))
	let panelSize = $state({ width: 300, height: 44 })
	// Fitting the panel on screen must not overwrite where the user placed it.
	const position = $derived(
		settings.position
			? clampPosition(settings.position, { width: innerWidth, height: innerHeight }, panelSize)
			: null
	)
	const active = $derived(select(configuration, innerWidth, settings.selection))
	const offset = $derived(active ? (settings.offsets[active.width] ?? { x: 0, y: 0 }) : { x: 0, y: 0 })
	let failedSource = $state('')
	const error = $derived(
		!active
			? configuration.warnings.join(' ')
			: failedSource === active.src
				? `Could not load ${active.src}. Check the URL or choose another design.`
				: ''
	)
	// Key bookkeeping never drives rendering or effects.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const held = new Set<string>()
	let lastZero = 0

	onMount(() => {
		const updatePath = () => {
			pathname = window.location.pathname
		}
		updatePath()
		ready = true
		// Also catch SPA navigation when this instance survives a route change.
		const observer = new MutationObserver(updatePath)
		observer.observe(document.body, { childList: true, subtree: true })
		return () => observer.disconnect()
	})

	$effect(() => {
		if (!ready) return
		const nextKey = key
		let raw: string | null = null
		try {
			raw = localStorage.getItem(nextKey)
		} catch {
			/* Storage is optional. */
		}
		settings = restore(raw, configuration)
		loadedKey = nextKey
		held.clear()
		lastZero = 0
		failedSource = ''
	})

	$effect(() => {
		if (!ready || loadedKey !== key) return
		const value = JSON.stringify(settings)
		try {
			localStorage.setItem(loadedKey, value)
		} catch {
			/* Keep working in memory. */
		}
	})

	$effect(() => {
		if (ready) for (const warning of configuration.warnings) console.warn(`[Overlay] ${warning}`)
	})

	function setOffset(x: number, y: number) {
		if (active && Number.isFinite(x) && Number.isFinite(y)) settings.offsets[active.width] = { x, y }
	}

	function resetAll() {
		settings = { ...defaults(), visible: settings.visible }
		failedSource = ''
		held.clear()
		lastZero = 0
	}

	function keydown(event: KeyboardEvent) {
		if (!ready || !active || event.defaultPrevented || event.isComposing) return
		if (
			event
				.composedPath()
				.some(
					target =>
						target instanceof HTMLElement &&
						(target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'))
				)
		)
			return
		const { code, shiftKey, ctrlKey, altKey, metaKey } = event
		if (metaKey) return
		if (shiftKey && altKey && !ctrlKey && code === 'ArrowUp') {
			event.preventDefault()
			setOffset(0, 0)
			held.clear()
			return
		}
		if (altKey) return
		if (shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
			event.preventDefault()
			held.add(code)
			if (held.has('ArrowUp') && held.has('ArrowDown')) {
				setOffset(0, 0)
				held.clear()
			} else {
				const step = ctrlKey ? 1 : 10
				setOffset(
					offset.x + (code === 'ArrowRight' ? step : code === 'ArrowLeft' ? -step : 0),
					offset.y + (code === 'ArrowDown' ? step : code === 'ArrowUp' ? -step : 0)
				)
			}
			lastZero = 0
			return
		}
		if (ctrlKey || shiftKey || event.repeat) return
		if (/^Digit[0-9]$/.test(code)) {
			const digit = Number(code.slice(-1))
			const now = Date.now()
			const hide = digit === 0 && lastZero > 0 && now - lastZero < 500
			settings.visible = !hide
			if (!hide) settings.opacity = digit === 0 ? 100 : digit * 10
			lastZero = digit === 0 && !hide ? now : 0
		} else lastZero = 0
	}

	function portal(node: HTMLElement) {
		document.body.append(node)
		return { destroy: () => node.remove() }
	}
</script>

<svelte:window
	onpopstate={() => (pathname = window.location.pathname)}
	onkeydown={keydown}
	onkeyup={event => held.delete(event.code)}
	onblur={() => {
		held.clear()
		lastZero = 0
	}}
	bind:innerWidth
	bind:innerHeight
	bind:scrollX
	bind:scrollY />

{#if ready && loadedKey}
	{#if active && settings.visible}
		<div class="overlay" aria-hidden="true" use:portal>
			{#key active.src}
				<img
					class="image"
					src={active.src}
					alt=""
					draggable="false"
					onerror={() => {
						failedSource = active.src
					}}
					onload={() => {
						failedSource = ''
					}}
					style:width="{active.width}px"
					style:opacity={settings.opacity / 100}
					style:translate="calc(-50% + {offset.x - scrollX}px) {offset.y - scrollY}px" />
			{/key}
		</div>
	{/if}
	<div
		class="controls"
		style:left={position ? `${position.x}px` : undefined}
		style:top={position ? `${position.y}px` : undefined}
		style:right={position ? 'auto' : undefined}
		style:bottom={position ? 'auto' : undefined}
		use:portal
		bind:offsetWidth={panelSize.width}
		bind:offsetHeight={panelSize.height}>
		<Panel
			bind:settings
			size={panelSize}
			sources={configuration.sources}
			{active}
			{offset}
			{innerWidth}
			{innerHeight}
			{error}
			{setOffset}
			{resetAll} />
	</div>
{/if}

<style>
	.overlay {
		all: initial;
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 2147483646;
	}

	.image {
		all: initial;
		display: block;
		position: absolute;
		top: 0;
		left: 50%;
		height: auto;
		max-width: none;
		pointer-events: none;
	}

	.controls {
		all: initial;
		position: fixed;
		right: max(12px, env(safe-area-inset-right));
		bottom: max(12px, env(safe-area-inset-bottom));
		z-index: 2147483647;
		max-width: calc(100vw - 24px);
	}
</style>
