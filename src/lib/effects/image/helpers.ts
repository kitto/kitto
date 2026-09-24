import type { ImageGenerationPreset } from './types.js'

/**
 * Resolve `'auto'` to a concrete `'dark' | 'light'` value, checking sources in
 * priority order so the effect plays nicely with common app-side theme
 * conventions (not just the OS-level media query):
 *
 *   1. `<html data-theme="dark|light">`          — shadcn / many SSR apps
 *   2. `<html class="dark">` / `class="light">`  — Tailwind v3 darkMode: class
 *   3. `<html style="color-scheme: dark">`       — CSS-only theme toggles
 *   4. `matchMedia('(prefers-color-scheme: dark)')` — OS / browser preference
 *   5. Default `'dark'`                          — SSR-safe fallback
 */
export function detect_theme(): 'dark' | 'light' {
	if (typeof document === 'undefined') return 'dark'
	const html = document.documentElement

	const dataTheme = html.getAttribute('data-theme')
	if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme

	if (html.classList.contains('dark')) return 'dark'
	if (html.classList.contains('light')) return 'light'

	const colorScheme = html.style.colorScheme || getComputedStyle(html).colorScheme
	if (colorScheme === 'dark') return 'dark'
	if (colorScheme === 'light') return 'light'

	if (typeof window !== 'undefined' && window.matchMedia) {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	}
	return 'dark'
}

/** Normalise the `images` prop to a fresh array. */
export function normalise_images(input: string | string[] | undefined): string[] {
	if (!input) return []
	if (typeof input === 'string') return [input]
	return input.slice()
}

/** Resolve `revealInitialDelay` (seconds, or a `[min, max]` range) to milliseconds. */
export function resolve_initial_delay(value: number | [number, number] | undefined): number | undefined {
	if (value == null) return undefined
	if (typeof value === 'number') return Math.max(0, value) * 1000
	const [min, max] = value
	const lo = Math.max(0, Math.min(min, max))
	const hi = Math.max(0, Math.max(min, max))
	return (lo + Math.random() * (hi - lo)) * 1000
}

/** The regenerate churn always runs on one of these pixel-mosaic presets. */
export const PIXEL_CHURN_PRESETS = ['pixels-mechanic', 'pixels-organic'] as const

export type PixelChurnPreset = (typeof PIXEL_CHURN_PRESETS)[number]

export function is_pixel_churn_preset(name: ImageGenerationPreset): name is PixelChurnPreset {
	return (PIXEL_CHURN_PRESETS as readonly string[]).includes(name)
}
