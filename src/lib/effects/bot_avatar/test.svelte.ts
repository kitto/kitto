import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import {
	BotAvatar,
	BotAvatarSim,
	autoInk,
	botAvatarPalette,
	botAvatarPresets,
	botAvatarShapes,
	botAvatarTypes,
	parseColor,
	restPose
} from './exports.js'
import { clamp, hashSeed } from './helpers.js'

afterEach(() => cleanup())

describe('BotAvatar', () => {
	it('renders a labelled canvas and survives without a 2D context', () => {
		const { unmount } = render(BotAvatar, { type: 'ghost', state: 'working', size: 40 })
		const canvas = screen.getByRole('img', { name: 'Ghost bot, working' })
		expect(canvas.tagName).toBe('CANVAS')
		expect(canvas.classList.contains('ba')).toBe(true)
		expect(canvas.dataset.botAvatar).toBe('ghost')
		expect(canvas.dataset.state).toBe('working')
		expect(canvas.style.width).toBe('60px')
		fireEvent.click(canvas)
		unmount()
		expect(document.querySelector('canvas')).toBeNull()
	})

	it('falls back to defaults and passes class, style and attributes through', () => {
		render(BotAvatar, {
			state: 'nope' as never,
			face: 'mouth',
			class: 'mine',
			style: 'opacity: 0.5',
			title: 'hi',
			'aria-label': 'Agent'
		})
		const canvas = screen.getByRole('img', { name: 'Agent' })
		expect([...canvas.classList]).toEqual(expect.arrayContaining(['ba', 'mine']))
		expect(canvas.dataset.botAvatar).toBe('clover')
		expect(canvas.dataset.state).toBe('default')
		expect(canvas.dataset.face).toBe('mouth')
		expect(canvas.style.opacity).toBe('0.5')
		expect(canvas.title).toBe('hi')
	})
})

describe('bot avatar data', () => {
	it('has a shape and palette colour for all eighteen types', () => {
		expect(botAvatarTypes).toHaveLength(18)
		for (const t of botAvatarTypes) {
			expect(botAvatarShapes[t]).toMatch(/^M/)
			expect(botAvatarPalette[t]).toBe(botAvatarPresets[t].color)
		}
	})

	it('parses colours and picks readable ink', () => {
		expect(parseColor('#fff')).toEqual([255, 255, 255])
		expect(parseColor('rgb(1, 2, 3)')).toEqual([1, 2, 3])
		expect(parseColor('nope')).toBeNull()
		expect(autoInk('#111')).toBe('#F7F5F2')
		expect(autoInk('#35B8FF')).toBe('#1E1A33')
	})

	it('seeds and clamps like upstream', () => {
		expect(hashSeed('a')).toBe(hashSeed('a'))
		expect(hashSeed('a')).toBeGreaterThanOrEqual(0)
		expect(hashSeed('a')).toBeLessThan(1)
		expect(clamp(5, 0, 2)).toBe(2)
		expect(clamp(NaN, 0, 2)).toBe(1)
	})

	it('steps the sim deterministically', () => {
		const a = new BotAvatarSim(0.3, 'default')
		const b = new BotAvatarSim(0.3, 'default')
		for (let i = 0; i < 30; i++) {
			a.update(1 / 60)
			b.update(1 / 60)
		}
		expect(a.pose).toEqual(b.pose)
		expect(restPose('sleeping')).toBeTypeOf('object')
	})
})
