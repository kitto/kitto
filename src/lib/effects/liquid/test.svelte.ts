import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import Fixture from './test.fixture.svelte'
import { Liquid, LiquidItem, EVOLVE_DEFAULTS, MOVE_DEFAULTS, easingFunction, presets } from './exports.js'
import { parseShadow } from './shadow.js'
import { splitShadows, gooIntercept } from './filter.js'
import { mapBend, mapMorphSprings, mapMove, resolveItem } from './tuning.js'
import { resolveTransition } from './spring.js'
import { meltProximity } from './image_melt.js'
import { roundedRectPath } from './geometry.js'

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe('Liquid', () => {
	it('exposes Item as a static property', () => {
		expect(Liquid.Item).toBe(LiquidItem)
	})

	for (const effect of ['morph', 'move', 'bend', 'melt'] as const) {
		it(`renders ${effect} items crisp above the silhouette layer and unmounts cleanly`, () => {
			vi.spyOn(console, 'warn').mockImplementation(() => {})
			const { unmount } = render(Fixture, { effect, x: 10, shadow: '0 2px 6px rgba(0,0,0,.08)' })
			flushSync()
			const group = screen.getByTestId('group')
			expect(screen.getByText('One')).toBeTruthy()
			expect(screen.getByText('Two')).toBeTruthy()
			expect(screen.getByText('plain')).toBeTruthy()
			expect(group.style.isolation).toBe('isolate')
			const sil = group.querySelector('[data-gooey-svg] g[filter]')
			expect(sil).not.toBeNull()
			// One blob per engine / mirrored item (melt items paint through their own layer).
			expect(sil!.querySelectorAll('rect, path').length).toBeGreaterThan(0)
			expect(group.querySelector('[data-gooey-svg]')!.getAttribute('style')).toContain('drop-shadow')
			expect(() => unmount()).not.toThrow()
		})
	}

	it('throws when an item renders outside a group', () => {
		expect(() => render(LiquidItem, {})).toThrow(/inside a <Gooey> group/)
	})
})

describe('shadow parsing', () => {
	it('parses multi-layer box-shadow with inset and spread', () => {
		expect(parseShadow('0 2px 6px rgba(0,0,0,.08), inset 0 1px 0 0 #fff')).toEqual([
			{ x: 0, y: 2, blur: 6, spread: 0, color: 'rgba(0,0,0,.08)', inset: false },
			{ x: 0, y: 1, blur: 0, spread: 0, color: '#fff', inset: true }
		])
		expect(parseShadow('none')).toEqual([])
	})

	it('routes blurred outer shadows to CSS and spread/inset layers to SVG', () => {
		const split = splitShadows(parseShadow('0 4px 10px red, 0 0 0 2px blue, inset 0 1px 0 #fff'), 6, 24)
		expect(split.cssShadowFilter).toBe('drop-shadow(0px 4px 10px red)')
		expect(split.svgShadows).toHaveLength(2)
		expect(split.pad).toBe(18 + 2 + 24)
		expect(gooIntercept(18)).toBe(-7)
	})
})

describe('tuning', () => {
	it('reproduces the engine defaults at the default knob positions', () => {
		const m = mapMove(undefined)
		expect(m.stiffness).toBeCloseTo(MOVE_DEFAULTS.stiffness)
		expect(m.damping).toBeCloseTo(MOVE_DEFAULTS.damping)
		const e = mapMorphSprings({})
		expect(e.massStiffness).toBe(EVOLVE_DEFAULTS.massStiffness)
		expect(e.massDamping).toBeCloseTo(EVOLVE_DEFAULTS.massDamping)
		expect(mapBend(undefined)).toMatchObject({ bend: 0.6, bendX: 0.35, stretch: 0, tail: 0 })
	})

	it('only runs the engine when the effect needs it', () => {
		expect(resolveItem({}).observe).toBe(false)
		expect(resolveItem({ morph: { shape: true } })).toMatchObject({ observe: true, effect: ['evolve'] })
		expect(resolveItem({ dissolve: 0.5 }).contactBlur).toMatchObject({ strength: 0.5, warp: 26 })
		expect(resolveItem({ effect: 'move' })).toMatchObject({ observe: true, effect: ['move'] })
	})
})

describe('spring + geometry', () => {
	it('compiles presets and snaps under reduced motion', () => {
		expect(presets.bouncy).toEqual({ stiffness: 320, damping: 17, mass: 1 })
		expect(resolveTransition('smooth', true)).toEqual({ duration: 0, easing: 'linear' })
		expect(resolveTransition({ duration: 300 }).easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)')
		expect(resolveTransition('bouncy').duration).toBeGreaterThan(0)
		const lin = easingFunction('linear(0, 0.5, 1)')
		expect(lin(0.25)).toBeCloseTo(0.25)
		expect(easingFunction('ease')(1)).toBe(1)
	})

	it('builds rounded paths and melt proximity', () => {
		expect(roundedRectPath(0, 0, 10, 10, [0, 0, 0, 0])).toMatch(/^M 0 0 H 10/)
		const a = { x: 0, y: 0, w: 80, h: 80, r: 16 }
		expect(meltProximity(a, { ...a, x: 80 }, 7)).toBe(1)
		expect(meltProximity(a, { ...a, x: 200 }, 7)).toBe(0)
	})
})
