import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/svelte'
import ThinkingOrb from './index.svelte'
import { countDots, MODE_FRAMES, parseTint, resolvePreset, STATE_TO_MODE, type OrbState } from './exports.js'
import { ancestorTheme } from './theme.js'

afterEach(() => cleanup())

const STATES = Object.keys(STATE_TO_MODE) as OrbState[]

describe('ThinkingOrb', () => {
	it('renders a labelled canvas without a 2D context', () => {
		render(ThinkingOrb, { state: 'searching', size: 20, class: 'orb', 'data-x': '1' })
		const canvas = screen.getByRole('img', { name: 'Searching…' })
		expect(canvas.tagName).toBe('CANVAS')
		expect(canvas.classList.contains('orb')).toBe(true)
		expect(canvas.dataset.x).toBe('1')
		expect(canvas.style.width).toBe('20px')
	})

	it('uses the per-state label, overridable by aria-label', () => {
		render(ThinkingOrb, { state: 'breathing' })
		expect(screen.getByRole('img', { name: 'Thinking…' })).toBeTruthy()
		cleanup()
		render(ThinkingOrb, { state: 'breathing', 'aria-label': 'Analysing repository…' })
		expect(screen.getByRole('img', { name: 'Analysing repository…' })).toBeTruthy()
	})

	it('unmounts cleanly with gravity attached', () => {
		const { unmount } = render(ThinkingOrb, { gravity: true, opts: { spread: 1.2 } })
		expect(() => unmount()).not.toThrow()
	})
})

describe('presets', () => {
	it('resolves every state at every size to a mode and caches it', () => {
		for (const state of STATES) {
			for (const size of [64, 32, 20] as const) {
				const r = resolvePreset(state, size)
				expect(r.mode).toBe(STATE_TO_MODE[state])
				expect(r.speed).toBeGreaterThan(0)
				expect(resolvePreset(state, size)).toBe(r)
			}
		}
	})

	it('scales density down for the small size', () => {
		expect(countDots(resolvePreset('searching', 20).opts)).toBeLessThan(
			countDots(resolvePreset('searching', 64).opts)
		)
	})

	it('produces finite, z-sorted frames for every mode', () => {
		for (const state of STATES) {
			const { mode, opts } = resolvePreset(state, 64)
			const { dots } = MODE_FRAMES[mode](64, 1.3, opts)
			expect(dots.length).toBeGreaterThan(0)
			for (let i = 1; i < dots.length; i++) expect(dots[i].z).toBeGreaterThanOrEqual(dots[i - 1].z)
			expect(dots.every(d => Number.isFinite(d.x) && Number.isFinite(d.y) && d.r >= 0.25)).toBe(true)
		}
	})
})

describe('parseTint', () => {
	it('parses hex and rgb colors', () => {
		expect(parseTint('#f80')).toEqual({ r: 255, g: 136, b: 0 })
		expect(parseTint('#1e90ff')).toEqual({ r: 30, g: 144, b: 255 })
		expect(parseTint('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3 })
		expect(parseTint('tomato')).toBeUndefined()
		expect(parseTint(undefined)).toBeUndefined()
	})
})

describe('ancestorTheme', () => {
	it('reads the nearest data-theme or class', () => {
		const outer = document.createElement('div')
		outer.className = 'dark'
		const inner = document.createElement('div')
		inner.setAttribute('data-theme', 'light')
		const leaf = document.createElement('span')
		inner.append(leaf)
		outer.append(inner)
		expect(ancestorTheme(leaf)).toBe(false)
		inner.removeAttribute('data-theme')
		expect(ancestorTheme(leaf)).toBe(true)
		expect(ancestorTheme(document.createElement('i'))).toBe(null)
	})
})
