import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { createRawSnippet, flushSync } from 'svelte'
import BorderBeam from './index.svelte'
import { generateBeamCSS, getPulseDriverConfig, sizePresets, sizeThemePresets, themeColors } from './styles.js'
import { registerPulseInstance } from './pulse_driver.js'

const card = createRawSnippet(() => ({
	render: () => '<div class="card" style="border-top-left-radius: 12px">Content</div>'
}))

afterEach(() => cleanup())

describe('BorderBeam', () => {
	it('renders children, the bloom layer and a scoped stylesheet', () => {
		const { container, unmount } = render(BorderBeam, { children: card, class: 'wrap', id: 'x' })
		const root = container.querySelector('[data-beam]') as HTMLElement
		const id = root.dataset.beam!
		expect(root.querySelector('.card')?.textContent).toBe('Content')
		expect(root.querySelector('[data-beam-bloom]')).not.toBeNull()
		expect(root.hasAttribute('data-active')).toBe(true)
		expect(root.className).toBe('wrap')
		expect(root.id).toBe('x')
		expect(root.style.getPropertyValue('--beam-strength')).toBe('1')
		const style = container.querySelector('style')!
		expect(style.textContent).toContain(`[data-beam="${id}"]`)
		flushSync()
		// detected from the first child (jsdom does not expand the border-radius shorthand)
		expect(style.textContent).toContain('border-radius: 12px')
		expect(() => unmount()).not.toThrow()
	})

	it('clamps strength and substitutes {id} in extra css', () => {
		const { container } = render(BorderBeam, {
			children: card,
			strength: 3,
			css: '[data-beam="{id}"] { color: red }'
		})
		const root = container.querySelector('[data-beam]') as HTMLElement
		expect(root.style.getPropertyValue('--beam-strength')).toBe('1')
		expect(container.querySelector('style')!.textContent).toContain(
			`[data-beam="${root.dataset.beam}"] { color: red }`
		)
	})

	it('renders every size without throwing', () => {
		for (const size of ['sm', 'md', 'line', 'pulse-inner', 'pulse-outside'] as const) {
			const { unmount } = render(BorderBeam, { children: card, size, theme: 'light', colorVariant: 'ocean' })
			unmount()
		}
	})

	it('fades out and fires onDeactivate', async () => {
		const onDeactivate = vi.fn()
		const { container, rerender } = render(BorderBeam, { children: card, onDeactivate })
		const root = container.querySelector('[data-beam]') as HTMLElement
		await rerender({ active: false })
		expect(root.hasAttribute('data-fading')).toBe(true)
		const event = new Event('animationend', { bubbles: true }) as AnimationEvent
		Object.defineProperty(event, 'animationName', { value: `beam-fade-out-${root.dataset.beam}` })
		await fireEvent(root, event)
		flushSync()
		expect(onDeactivate).toHaveBeenCalledOnce()
		expect(root.hasAttribute('data-active')).toBe(false)
		expect(root.hasAttribute('data-fading')).toBe(false)
	})
})

describe('styles', () => {
	it('keeps upstream presets', () => {
		expect(sizePresets.sm.borderRadius).toBe(32)
		expect(sizeThemePresets.md.dark.strokeOpacity).toBe(0.26)
		expect(themeColors.light).toEqual(sizeThemePresets.md.light)
	})

	it('only builds a pulse driver for pulse sizes', () => {
		expect(getPulseDriverConfig('md', 'dark', 1.96, 30, false, 'a')).toBeNull()
		const config = getPulseDriverConfig('pulse-inner', 'dark', 2.3, 30, false, 'a')!
		expect(config.oscillators).toHaveLength(17)
		expect(config.hue).toEqual({ prop: '--beam-hue-a', range: 360, period: 16, continuous: true })
		expect(getPulseDriverConfig('pulse-outside', 'dark', 2.3, 30, true, 'a')!.hue).toBeNull()
	})

	it('generates per-instance keyframes', () => {
		const css = generateBeamCSS({
			id: 'b1',
			borderRadius: 16,
			borderWidth: 1,
			duration: 1.96,
			...sizeThemePresets.md.dark,
			size: 'md',
			colorVariant: 'colorful',
			staticColors: false,
			brightness: 1.3,
			hueRange: 30,
			theme: 'dark'
		})
		expect(css).toContain('@keyframes beam-fade-in-b1')
	})
})

describe('pulse driver', () => {
	it('drives oscillators from a shared rAF loop', () => {
		const frames: FrameRequestCallback[] = []
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
		vi.stubGlobal('cancelAnimationFrame', vi.fn())
		const el = document.createElement('div')
		const stop = registerPulseInstance(el, getPulseDriverConfig('pulse-inner', 'dark', 2.3, 30, false, 'p')!)
		frames.shift()!(1000)
		expect(el.style.getPropertyValue('--bw1-p')).not.toBe('')
		expect(el.style.getPropertyValue('--beam-hue-p')).toMatch(/deg$/)
		stop()
		expect(cancelAnimationFrame).toHaveBeenCalled()
		vi.unstubAllGlobals()
	})
})
