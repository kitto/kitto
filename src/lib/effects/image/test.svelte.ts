import { describe, it, expect, afterEach } from 'vitest'
import { createRawSnippet } from 'svelte'
import { render, cleanup } from '@testing-library/svelte'
import { ImageGeneration, PRESETS, parseCssColor, hexToRgb, ease } from './index.js'
import { normalise_images, resolve_initial_delay, is_pixel_churn_preset } from './helpers.js'
import { effectiveCellSize } from './engine/index.js'

afterEach(() => cleanup())

const card = createRawSnippet(() => ({
	render: () => '<div class="card" style="width: 200px; height: 120px; border-radius: 12px">card</div>'
}))

describe('ImageGeneration', () => {
	it('renders the wrapped child, both canvases and data attributes without WebGL', () => {
		const { container } = render(ImageGeneration, {
			props: { children: card, preset: 'sweep-gradient', theme: 'light', paused: true, id: 'fx' }
		})
		const root = container.querySelector('.image-gen-root') as HTMLElement
		expect(root).toBeTruthy()
		expect(root.id).toBe('fx')
		expect(root.dataset.preset).toBe('sweep-gradient')
		expect(root.dataset.theme).toBe('light')
		expect(root.dataset.paused).toBe('true')
		expect(root.querySelectorAll('canvas[aria-hidden="true"]')).toHaveLength(2)
		expect(root.querySelector('.image-gen-child .card')?.textContent).toBe('card')
		const [r, g, b] = parseCssColor(PRESETS['sweep-gradient'].modes.light.cardBg).map(c => Math.round(c * 255))
		expect(root.style.background).toBe(`rgb(${r}, ${g}, ${b})`)
	})

	it('exposes a safe imperative surface and unmounts cleanly', () => {
		const { component, unmount } = render(ImageGeneration, {
			props: { children: card, images: ['/a.jpg'], autoReveal: true, cardBg: '#123456' }
		})
		expect(component.element()).toBeInstanceOf(HTMLDivElement)
		expect(() => component.triggerReveal({ hold: 'manual' })).not.toThrow()
		expect(() => component.triggerHide()).not.toThrow()
		expect(() => component.triggerRegenerate({ durationMs: 100 })).not.toThrow()
		expect(component.isImageActive()).toBe(false)
		expect(component.element()?.style.background).toBe('rgb(18, 52, 86)')
		expect(() => unmount()).not.toThrow()
	})
})

describe('helpers', () => {
	it('normalises images', () => {
		expect(normalise_images(undefined)).toEqual([])
		expect(normalise_images('/a.jpg')).toEqual(['/a.jpg'])
		const pool = ['/a.jpg', '/b.jpg']
		expect(normalise_images(pool)).not.toBe(pool)
	})

	it('resolves the initial delay', () => {
		expect(resolve_initial_delay(undefined)).toBeUndefined()
		expect(resolve_initial_delay(1.5)).toBe(1500)
		expect(resolve_initial_delay(-1)).toBe(0)
		const ms = resolve_initial_delay([3, 1]) as number
		expect(ms).toBeGreaterThanOrEqual(1000)
		expect(ms).toBeLessThanOrEqual(3000)
	})

	it('knows which presets can host the regenerate churn', () => {
		expect(is_pixel_churn_preset('pixels-organic')).toBe(true)
		expect(is_pixel_churn_preset('pixels-mechanic')).toBe(true)
		expect(is_pixel_churn_preset('sweep-gradient')).toBe(false)
	})
})

describe('presets and engine helpers', () => {
	it('ships dark and light modes for each preset', () => {
		for (const name of ['pixels-organic', 'pixels-mechanic', 'sweep-gradient'] as const) {
			expect(PRESETS[name].modes.dark.theme).toBe('dark')
			expect(PRESETS[name].modes.light.theme).toBe('light')
			expect(PRESETS[name].modes.dark.colors).toHaveLength(7)
		}
	})

	it('parses hex colours without the DOM', () => {
		expect(parseCssColor('#ff0000')).toEqual([1, 0, 0])
		expect(parseCssColor('#fff')).toEqual([1, 1, 1])
		expect(parseCssColor('')).toEqual([0, 0, 0])
		expect(hexToRgb('#000000')).toEqual([0, 0, 0])
	})

	it('clamps easing input and scales cell size', () => {
		expect(ease('linear', 2)).toBe(1)
		expect(ease('smoothstep', 0.5)).toBe(0.5)
		expect(effectiveCellSize(0.5, 1)).toBe(0.5)
		expect((6 + effectiveCellSize(0.5, 2) * 74) * 2).toBeCloseTo(6 + 0.5 * 74)
	})
})
