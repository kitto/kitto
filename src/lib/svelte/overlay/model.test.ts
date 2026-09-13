import { describe, expect, it } from 'vitest'
import { clampPosition, configure, defaults, restore, select, storageKey } from './model.js'

const srcset = '/desktop.jpg 1920w, /tablet.jpg 1024w, /mobile.jpg 393w'

describe('overlay sources', () => {
	it('keeps the panel inside viewport edges and restores valid positions', () => {
		const viewport = { width: 1024, height: 768 }
		const size = { width: 300, height: 400 }
		expect(clampPosition({ x: -100, y: 9999 }, viewport, size)).toEqual({ x: 12, y: 356 })
		expect(clampPosition({ x: 200, y: 80 }, viewport, size)).toEqual({ x: 200, y: 80 })
		expect(restore('{"position":{"x":200,"y":80}}', configure(srcset)).position).toEqual({ x: 200, y: 80 })
		expect(restore('{"position":{"x":"bad","y":80}}', configure(srcset)).position).toBeNull()
	})
	it('selects nearest widths, including midpoint ties and out-of-range viewports', () => {
		const config = configure(srcset)
		for (const [viewport, width] of [
			[0, 393],
			[708, 393],
			[709, 1024],
			[1471, 1024],
			[1472, 1920],
			[3000, 1920]
		]) {
			expect(select(config, viewport)?.width).toBe(width)
		}
		expect(select(config, 393, '1920')?.width).toBe(1920)
		expect(select(config, 393, 'missing')?.width).toBe(393)
	})

	it('ignores invalid descriptors and duplicate widths while keeping usable sources', () => {
		const config = configure(
			'/first.jpg 393w, /dupe.jpg 393w, /bad.jpg 0w, /density.jpg 2x, /missing.jpg, /negative.jpg -5w, /fraction.jpg 1.5w, /large.jpg 999999999999999999999w, /file@2x.jpg?q=a 1024w'
		)
		expect(config.sources.map(source => source.src)).toEqual(['/first.jpg', '/file@2x.jpg?q=a'])
		expect(config.warnings).toHaveLength(7)
		expect(select(configure(''), 1024)).toBeUndefined()
	})

	it('retains legacy sizing, switching, and single-source fallback', () => {
		const config = configure(undefined, '/m.jpg@400', '/d.jpg@1600')
		expect(select(config, 639)).toMatchObject({ src: '/m.jpg', width: 400 })
		expect(select(config, 640)).toMatchObject({ src: '/d.jpg', width: 1600 })
		const fallback = configure(undefined, undefined, '/only.jpg')
		expect(select(fallback, 393)).toMatchObject({ src: '/only.jpg', width: 393 })
		expect(select(fallback, 1920)).toMatchObject({ src: '/only.jpg', width: 1920 })
		expect(select(configure(undefined, '/only.jpg@800'), 1920)?.width).toBe(800)
		expect(configure('/new.jpg 1000w', '/old.jpg').sources).toHaveLength(1)
		expect(configure('', '/old.jpg').sources).toHaveLength(0)
	})

	it('normalizes order and scopes persistence to pathname and configuration', () => {
		const config = configure(srcset)
		expect(storageKey('/a', config)).toBe(
			storageKey('/a', configure('/mobile.jpg 393w,/tablet.jpg 1024w,/desktop.jpg 1920w'))
		)
		expect(storageKey('/a', config)).not.toBe(storageKey('/b', config))
		expect(storageKey('/a', config)).not.toBe(storageKey('/a', configure('/new.jpg 1920w')))
	})

	it('restores only valid settings and offsets for the current sources', () => {
		const config = configure(srcset)
		expect(restore('{bad json', config)).toEqual(defaults())
		expect(restore(null, config)).toEqual(defaults())
		expect(
			restore(
				JSON.stringify({
					visible: 'yes',
					expanded: true,
					opacity: 150,
					selection: 'missing',
					offsets: { 393: { x: -12, y: 18 }, 1024: { x: 'bad', y: 0 }, 800: { x: 1, y: 2 } }
				}),
				config
			)
		).toEqual({ ...defaults(), expanded: true, opacity: 100, offsets: { 393: { x: -12, y: 18 } } })
	})
})
