<!--
@component
@module BotAvatar
@group Effects
@remarks
Animated bot avatar — eighteen glossy 3D shapes with living faces that turn, hop and flip, in three
states an agent can be in: idle (`default`), `working` and `sleeping`. Vector shapes drawn on a 2D
canvas as a lit, rounded extrusion: no WebGL, no runtime dependencies.

The canvas overscans its box so the avatar has room to hop and flip, and pulls itself back in with
negative margins, so it still lays out at `size`. With `prefers-reduced-motion: reduce` (or `paused`)
the still pose of the state is drawn instead of the loop. Every avatar on the page shares one
animation frame loop, which stops while the tab is hidden and while an avatar is off screen.

Bind `element` to reach the canvas (upstream's forwarded ref).

Ported from `bot-avatars` in Libraries.dev by Jakub Antalik (MIT).
@example
```svelte
<script lang="ts">
  import { BotAvatar } from 'kitto/effects'

  let busy = $state(false)
</script>

<BotAvatar type="clover" state={busy ? 'working' : 'default'} />
<BotAvatar type="blob" face="mouth" color="#ff5c8a" size={96} />
```
-->
<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import type { BotAvatarProps, BotAvatarShading, BotAvatarState } from './types.js'
	import { botAvatarPresets, stateLabels } from './presets.js'
	import { SHAPE_PATHS, SHAPE_PARTS } from './shapes.js'
	import { autoInk, shade } from './color.js'
	import { Sim, restPose } from './engine.js'
	import { draw, OVERSCAN, RISE, type DrawConfig } from './draw.js'
	import { warmPlastic } from './plastic.js'
	import { subscribe, pointer } from './ticker.js'
	import { bodyPath, clamp, hashSeed, reducedMotion } from './helpers.js'

	let {
		type = 'clover',
		face,
		state = 'default',
		size = 64,
		color,
		ink,
		brightness = 1,
		saturation = 1.5,
		speed = 1,
		paused = false,
		seed,
		shading = 'plastic',
		shadow = 0.35,
		highlight = 1.3,
		depth = 0.65,
		light = 265,
		rim = 0.5,
		spread = 1.55,
		interactive = true,
		turn = 1,
		theme = 'auto',
		whirl = 0,
		whirlSize = 1,
		whirlWidth = 1,
		whirlLength = 1,
		whirlTilt = 1,
		jumpHeight = 26,
		jumpTime = 0.68,
		jumpStretch = 1,
		jumpSpin = 1,
		jumpLean = 6,
		jumpEvery = 8,
		jumpLand = 0,
		jumpSquash = 1.15,
		jumpSquashTime = 0.37,
		jumpSquashEase = 'pulse',
		jumpGroundTime = 0.11,
		jumpGroundEase = 'pulse',
		jumpRiseTime = 0.33,
		jumpRiseEase = 'pulse',
		jumpClickSquashTime = 0.24,
		class: className,
		style,
		element = $bindable(null),
		'aria-label': ariaLabel,
		onclick,
		...rest
	}: BotAvatarProps = $props()

	const uid = $props.id()

	const preset = $derived(botAvatarPresets[type] ?? botAvatarPresets.clover)
	const faceKind = $derived(face ?? preset.face)
	const picked = $derived(color ?? preset.color)
	const body = $derived(
		brightness === 1 && saturation === 1
			? picked
			: shade(
					picked,
					(Math.min(2, Math.max(0, brightness)) - 1) * 0.35,
					(Math.min(2, Math.max(0, saturation)) - 1) * 0.5
				)
	)
	const inkColor = $derived(ink ?? autoInk(body))
	const seedValue = $derived(Math.min(1, Math.max(0, seed ?? hashSeed(uid))))
	const stateKey: BotAvatarState = $derived(state in stateLabels ? state : 'default')
	const frozen = $derived(paused || !(speed > 0))
	const shadingMode: BotAvatarShading = $derived(
		shading === true ? 'crisp' : shading === false ? 'flat' : shading
	)

	/* the draw config, rebuilt when a prop changes; draw() stamps theme/dpr on it */
	const cfg: DrawConfig = $derived({
		path:
			typeof Path2D === 'undefined'
				? (null as unknown as Path2D)
				: bodyPath(SHAPE_PATHS[type] ?? SHAPE_PATHS.clover),
		face: faceKind,
		faceX: preset.faceX,
		faceY: preset.faceY,
		faceScale: preset.faceScale,
		color: body,
		ink: inkColor,
		shading: shadingMode,
		shadow: clamp(shadow, 0, 2),
		highlight: clamp(highlight, 0, 2),
		depth: clamp(depth, 0.2, 2),
		light,
		rim: clamp(rim, 0, 2),
		spread: clamp(spread, 0.4, 2.5),
		typeKey: type,
		still: frozen || reducedMotion(),
		whirl: {
			strength: clamp(whirl, 0, 2),
			size: clamp(whirlSize, 0.6, 1.6),
			width: clamp(whirlWidth, 0.4, 2),
			length: clamp(whirlLength, 0.4, 1.6),
			tilt: clamp(whirlTilt, 0.5, 1.8)
		},
		parts: typeof Path2D !== 'undefined' && SHAPE_PARTS[type] ? bodyPath(SHAPE_PARTS[type] as string) : undefined
	})

	/* the sim lives across prop changes */
	let sim: Sim | null = null
	let cssSize = 0

	/* the surface: an ancestor's say, else the system's */
	const resolveTheme = (el: HTMLElement | null): 'dark' | 'light' => {
		if (theme !== 'auto') return theme
		const host = el?.closest('[data-theme], .dark, .light') as HTMLElement | null
		if (host) {
			const v = host.getAttribute('data-theme')
			if (v === 'dark' || v === 'light') return v
			if (host.classList.contains('dark')) return 'dark'
			if (host.classList.contains('light')) return 'light'
		}
		return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
			? 'light'
			: 'dark'
	}

	const dprNow = () => Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1)

	/* paint the current pose, sizing the backing store to the element */
	const paint = () => {
		const canvas = element
		const c = cfg
		if (!canvas || !c || !c.path) return
		/* a hidden ancestor measures 0: keep the last size rather than
		   wiping the backing store */
		const px = canvas.clientWidth / OVERSCAN || cssSize || (typeof size === 'number' ? size : 64)
		if (!px) return
		const dpr = dprNow()
		const want = Math.round(px * OVERSCAN * dpr)
		if (canvas.width !== want || canvas.height !== want) {
			canvas.width = want
			canvas.height = want
		}
		cssSize = px
		const ctx = canvas.getContext('2d')
		if (!ctx) return
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		c.dpr = dpr
		const pose = sim ? sim.pose : restPose(stateKey)
		draw(ctx, px, pose, c)
	}

	/* first paint, and a repaint whenever a prop changes */
	$effect(() => {
		const canvas = element
		const c = cfg
		const key = stateKey
		if (!sim) sim = new Sim(seedValue, key)
		else sim.setState(key)
		sim.setTurn(clamp(turn, 0, 2))
		sim.setJump({
			height: jumpHeight,
			time: Math.max(0.2, jumpTime),
			stretch: jumpStretch,
			spin: Math.max(0, Math.round(jumpSpin)),
			lean: jumpLean,
			every: jumpEvery,
			land: jumpLand,
			squash: jumpSquash,
			squashTime: Math.max(0.05, jumpSquashTime),
			squashEase: jumpSquashEase,
			groundTime: Math.max(0, jumpGroundTime),
			groundEase: jumpGroundEase,
			riseTime: Math.max(0.05, jumpRiseTime),
			riseEase: jumpRiseEase,
			clickSquashTime: Math.max(0.05, jumpClickSquashTime)
		})
		if (reducedMotion()) {
			/* the still pose of the state, no loop */
			if (canvas && c.path) {
				const px = canvas.clientWidth / OVERSCAN || cssSize || (typeof size === 'number' ? size : 64)
				if (!px) return
				cssSize = px
				const dpr = dprNow()
				canvas.width = canvas.height = Math.round(px * OVERSCAN * dpr)
				const ctx = canvas.getContext('2d')
				if (ctx) {
					c.theme = resolveTheme(canvas)
					c.dpr = dpr
					ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
					draw(ctx, px, restPose(key), c)
				}
			}
			return
		}
		/* the surface's theme, read once per change rather than per frame */
		if (canvas) c.theme = resolveTheme(canvas)
		paint()
	})

	/* plastic bakes its form per type; start that on idle time at mount so
	   the first frames do not stand in with the smooth look for long */
	$effect(() => {
		const path = cfg.path
		if (shadingMode !== 'plastic' || !path) return
		const t = type
		const d = depth
		const dev = (typeof size === 'number' ? size : 64) * dprNow()
		const ric = (
			typeof requestIdleCallback === 'function' ? requestIdleCallback : (fn: () => void) => setTimeout(fn, 1)
		) as (fn: () => void) => number
		const id = ric(() => warmPlastic(t, path, dev, d))
		return () => {
			if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id)
			else clearTimeout(id)
		}
	})

	/* the loop: only while visible, animated and not reduced */
	$effect(() => {
		const canvas = element
		if (frozen || reducedMotion() || !canvas) return
		let unsub: (() => void) | null = null
		/* how far the pointer's pull reaches, in head widths */
		const REACH = 3
		const tick = (dt: number) => {
			const s = sim
			if (!s) return
			if (interactive && !Number.isNaN(pointer.x)) {
				const r = canvas.getBoundingClientRect()
				const box = r.width / OVERSCAN || 1
				const dx = (pointer.x - (r.left + r.width / 2)) / box
				const dy = (pointer.y - (r.top + r.height / 2 + RISE * box)) / box
				const d = Math.hypot(dx, dy)
				/* full pull up close, gone by REACH */
				const strength = d < 1 ? 1 : d > REACH ? 0 : 1 - (d - 1) / (REACH - 1)
				s.setPointer(dx / Math.max(1, d), dy / Math.max(1, d), strength)
			} else s.setPointer(0, 0, 0)
			s.update(dt * speed)
			paint()
		}
		const run = () => {
			if (!unsub) unsub = subscribe(tick)
		}
		const stop = () => {
			if (unsub) unsub()
			unsub = null
		}
		let io: IntersectionObserver | null = null
		if (typeof IntersectionObserver === 'function') {
			io = new IntersectionObserver(entries => {
				if (entries[0]?.isIntersecting ?? true) run()
				else stop()
			})
			io.observe(canvas)
		} else run()
		return () => {
			stop()
			if (io) io.disconnect()
		}
	})

	/* The canvas overscans its box (see draw.ts) and pulls itself back in
	   with negative margins, so it lays out at `size` and still has room
	   to hop and flip. */
	const layout = $derived.by(() => {
		const dim = typeof size === 'number' ? `${size * OVERSCAN}px` : `calc(${size} * ${OVERSCAN})`
		const pull = (k: number) => (typeof size === 'number' ? `${-size * k}px` : `calc(${size} * ${-k})`)
		const side = (OVERSCAN - 1) / 2
		return (
			`display:inline-block;vertical-align:middle;width:${dim};height:${dim};` +
			`margin-left:${pull(side)};margin-right:${pull(side)};` +
			`margin-top:${pull(side + RISE)};margin-bottom:${pull(side - RISE)};flex:none;` +
			(style ?? '')
		)
	})

	const handleClick: MouseEventHandler<HTMLCanvasElement> = e => {
		if (interactive && !frozen) sim?.poke()
		onclick?.(e)
	}
</script>

<canvas
	bind:this={element}
	class={['ba', className]}
	data-bot-avatar={type}
	data-face={faceKind}
	data-state={stateKey}
	role="img"
	aria-label={ariaLabel ?? `${preset.label} bot, ${stateLabels[stateKey]}`}
	style={layout}
	{...rest}
	onclick={handleClick}></canvas>
