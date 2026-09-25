import type { Snippet } from 'svelte'
import type { HTMLAttributes } from 'svelte/elements'
import type { CycleEvent } from './engine/index.js'
import type { PresetName } from './presets/index.js'

/**
 * Theme mode for the image effect.
 *
 * - `auto` (default): walks a small priority chain and updates live on any
 *   change:
 *     1. `<html data-theme="dark|light">`             — shadcn / SSR apps
 *     2. `<html class="dark">` / `class="light">`     — Tailwind v3 darkMode
 *     3. `<html style="color-scheme: dark|light">`    — CSS-only toggles
 *     4. `matchMedia('(prefers-color-scheme: dark)')` — OS preference
 *     5. `'dark'` fallback (SSR-safe; re-resolves on hydration)
 *   A MutationObserver on `<html>` re-resolves whenever class / style /
 *   data-theme changes, so JS theme toggles propagate without a remount.
 * - `dark` / `light`: pin to a specific mode regardless of system / app
 *   preference.
 */
export type ImageGenerationTheme = 'auto' | 'dark' | 'light'

/** Bundled preset names. Each preset ships both a dark and light tunings block. */
export type ImageGenerationPreset = PresetName

/** Phase event emitted by the auto-reveal scheduler. */
export type ImageGenerationCycleEvent = CycleEvent

/**
 * Imperative surface exposed on the component instance via `bind:this`. Lets
 * callers trigger a single reveal from a button click or other user action
 * without enabling `autoReveal`.
 *
 * The wrapper element itself is also reachable via `element()`.
 */
export interface ImageGenerationHandle {
	/** The wrapper `<div>` element (or `null` before mount). */
	element: () => HTMLDivElement | null
	/**
	 * Run a reveal pass now.
	 *
	 * - No-op if a reveal is already in progress (currently revealing, holding
	 *   the image visible, or fading back to the shader).
	 * - `hold: 'auto'` (default) — runs reveal -> hold (`revealHoldMs`) -> hide
	 *   automatically, mirroring the auto-loop's pass.
	 * - `hold: 'manual'` — runs reveal then stays in the visible phase until
	 *   `triggerHide()` is called. Use this for "Reveal / Hide" toggle buttons.
	 *
	 * Requires a non-empty `images` prop; otherwise it's a silent no-op.
	 */
	triggerReveal: (opts?: { hold?: 'auto' | 'manual' }) => void
	/**
	 * Manually trigger the hide fade if an image is currently revealed (in
	 * `reveal` or `visible` phase). No-op otherwise.
	 */
	triggerHide: () => void
	/**
	 * Regenerate the currently revealed image in place: the image breaks into
	 * the effect's pixel-cell grid, the cells churn (pop in/out with the
	 * preset's flicker clock) while the shader plays through the gaps, and
	 * after `durationMs` the next image from the pool dissolves in over the
	 * churn (held like `triggerReveal({ hold: 'manual' })`).
	 *
	 * By default the effect is also recolored from the outgoing image — its
	 * palette is sampled from the visible pixels and mapped onto the preset's
	 * palette slots by luminance rank. The preset palette (or the `colors`
	 * prop, when set) is restored automatically once the new image is fully
	 * visible.
	 *
	 * The churn always runs on a pixel-mosaic preset (`pixels-mechanic` /
	 * `pixels-organic`). When the active preset is `sweep-gradient`, the effect
	 * temporarily switches to a randomly-picked pixel preset for the churn and
	 * restores the authored preset once the new image is fully visible.
	 *
	 * Options:
	 * - `durationMs` — churn length before the next image auto-reveals. Default 4000.
	 * - `tintFromImage` — recolor the effect from the outgoing image. Default true.
	 * - `autoReveal` — set to `false` to churn indefinitely instead; end it
	 *   manually with `triggerReveal()` or `triggerHide()`. Default true.
	 *
	 * No-op unless an image is currently revealed (`reveal` or `visible`
	 * phase). Emits an `idle` cycle event when the churn starts.
	 */
	triggerRegenerate: (opts?: { durationMs?: number; tintFromImage?: boolean; autoReveal?: boolean }) => void
	/**
	 * Returns true while an image is showing on top of the shader (any of the
	 * `reveal`, `visible`, or `hide` phases). Useful for driving the label /
	 * icon of a Reveal/Hide toggle button.
	 */
	isImageActive: () => boolean
}

export interface ImageGenerationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'> {
	/**
	 * Single host element to wrap. The wrapper sizes itself to the child; the
	 * shader paints inside the wrapper at full size, clipped to the child's
	 * border-radius.
	 */
	children?: Snippet

	/**
	 * Selects which bundled preset to render.
	 *
	 * - `pixels-organic` - Chromium Flow rendered as a pixel mosaic.
	 * - `pixels-mechanic`- Nebula rendered as a pixel mosaic.
	 * - `sweep-gradient` - Gradient Sweep rendered as a pixel mosaic.
	 *
	 * @default 'pixels-organic'
	 */
	preset?: ImageGenerationPreset

	/**
	 * Theme mode. `'auto'` resolves from the document / `prefers-color-scheme`
	 * and switches live when the theme changes.
	 * @default 'auto'
	 */
	theme?: ImageGenerationTheme

	/**
	 * Effect strength (0..2). In 0..1 it multiplies the shader canvas opacity
	 * (the shader keeps animating at full intensity; only the rendered alpha
	 * is scaled down). Above 1 the canvas stays fully opaque and the shader's
	 * palette intensity is boosted instead, making the effect markedly more
	 * prominent.
	 * @default 1
	 */
	strength?: number

	/**
	 * Animation speed multiplier on top of the preset's baked tempo. Scales
	 * the effect's whole clock — drift, churn and flicker together — so the
	 * character of the motion is preserved. `1` (default) is the preset
	 * tempo; `0.5` half speed, `2` double.
	 * @default 1
	 */
	speed?: number

	/**
	 * Pixel-cell size multiplier for the mosaic effect. Scales the on-screen
	 * size of each pixel cell (and the matching reveal dissolve) without
	 * touching the preset: `1` is the preset's authored cell size, `0.5` cells
	 * at half size, `2` cells at double size. The grid always keeps a floor of
	 * 2 cells, so extreme values are safe.
	 * @default 1
	 */
	pixelScale?: number

	/**
	 * Space between mosaic cells as a fraction of a cell (0..1). Overrides the
	 * preset's gap of `0.14`; `0` removes it. Highlighted cells render a smaller
	 * gap. Omit to use the preset's value.
	 */
	gap?: number

	/**
	 * Card background colour. Accepts any CSS colour string the browser can
	 * parse and is applied two ways: verbatim as the wrapper element's CSS
	 * `background`, and parsed to an opaque RGB triple for the shader's
	 * `u_cardBg` uniform, which drives colour-proximity / contrast logic.
	 * When omitted, the preset's bundled `cardBg` is used.
	 */
	cardBg?: string

	/**
	 * Optional palette override for the running effect (up to 7 CSS colors,
	 * one per shader palette slot). A slot with a value replaces the preset
	 * color verbatim; `null` / `undefined` slots keep the preset color. Omit to
	 * use the preset palette.
	 */
	colors?: (string | null | undefined)[]

	/**
	 * Image pool used by the reveal animation. Pass a single string to reveal
	 * the same image every cycle, or an array for random pick (never
	 * repeating the previous index).
	 * @default []
	 */
	images?: string | string[]

	/**
	 * When true, runs the auto-reveal scheduler:
	 *   shader (random delay) -> reveal -> hold -> hide -> repeat.
	 * @default false
	 */
	autoReveal?: boolean

	/**
	 * Random shader-only delay range in seconds between reveals.
	 * @default [2, 4]
	 */
	revealDelayRange?: [number, number]

	/**
	 * One-time delay applied before the very first reveal. Subsequent reveals
	 * follow `revealDelayRange`.
	 *
	 * - `number`: exact seconds.
	 * - `[min, max]`: seconds range, randomised once at cycle creation.
	 * - `undefined` (default): library picks a small jitter (0-1.5 s) so
	 *   multiple instances on the same page don't tick in lockstep.
	 */
	revealInitialDelay?: number | [number, number]

	/**
	 * Time the image stays fully visible after the reveal animation completes,
	 * before the hide cross-fade kicks in. A number is fixed milliseconds;
	 * `[min, max]` picks random milliseconds per cycle.
	 * @default 2000
	 */
	revealHoldMs?: number | [number, number]

	/** ms cross-fade back to the shader. @default 300 */
	revealFadeOutMs?: number

	/**
	 * Optional explicit corner radius (CSS px). When omitted, reads the
	 * computed `border-radius` of the wrapped child each resize.
	 */
	borderRadius?: number

	/** Freezes the shader and the auto-reveal scheduler. @default false */
	paused?: boolean

	/**
	 * Escape hatch: a replacement fragment shader (GLSL 1.00 syntax, as the
	 * bundled one — `gl_FragColor`, `texture2D`). Every uniform the engine
	 * uploads keeps its name. The material is shared, so this applies
	 * page-wide while set.
	 */
	fragmentShader?: string

	/** Phase event hook for the auto-reveal cycle. */
	onCycle?: (event: ImageGenerationCycleEvent) => void

	/**
	 * Optional callback invoked just before each image pick that returns a list
	 * of src strings the cycle MUST avoid this round. Use this to coordinate
	 * multiple instances that share an image pool so they never display the
	 * same image at the same time. If every candidate is excluded, the cycle
	 * falls back to a normal random pick.
	 */
	excludeSrcs?: () => string[] | Set<string> | null | undefined

	/** Inline styles for the wrapper element (appended after the card background). */
	style?: string
}
