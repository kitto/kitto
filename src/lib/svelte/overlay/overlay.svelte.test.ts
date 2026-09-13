import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import Overlay from './index.svelte'
import { configure, defaults, storageKey } from './model.js'

// DOM tests use reduced motion; browser checks exercise the actual slide transition.
vi.mock('svelte/motion', () => ({ prefersReducedMotion: { current: true } }))

const srcset = '/desktop.jpg 1920w, /tablet.jpg 1024w, /mobile.jpg 393w'
const OriginalResizeObserver = window.ResizeObserver
const image = () => document.querySelector('.overlay > .image') as HTMLImageElement | null
const x = () => screen.getByRole('spinbutton', { name: 'X Offset' }) as HTMLInputElement
const y = () => screen.getByRole('spinbutton', { name: 'Y Offset' }) as HTMLInputElement
const resize = async (width: number) => {
	window.innerWidth = width
	await fireEvent(window, new Event('resize'))
}
const press = async (code: string, modifiers: KeyboardEventInit = {}, target: EventTarget = window) => {
	const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...modifiers })
	target.dispatchEvent(event)
	await tick()
	return event
}
const open = async () => fireEvent.click(screen.getByRole('button', { name: /Overlay/ }))

beforeEach(() => {
	localStorage.clear()
	window.history.replaceState({}, '', '/')
	window.innerWidth = 1024
	window.innerHeight = 768
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300)
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200)
})
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
	window.ResizeObserver = OriginalResizeObserver
})

describe('Overlay', () => {
	it('returns to its saved bottom-corner position after expanding and collapsing', async () => {
		let height = 44
		let resized = () => {}
		window.ResizeObserver = class {
			constructor(callback: ResizeObserverCallback) {
				resized = () =>
					callback(
						[{ target: document.querySelector('.controls:has(> .tool)') } as ResizeObserverEntry],
						this
					)
			}
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height)
		const key = storageKey('/', configure(srcset))
		localStorage.setItem(key, JSON.stringify({ ...defaults(), position: { x: 712, y: 712 } }))
		render(Overlay, { srcset })
		await tick()
		const controls = document.querySelector('.controls:has(> .tool)') as HTMLElement
		for (let cycle = 0; cycle < 2; cycle++) {
			expect(controls.style.top).toBe('712px')
			await open()
			height = 400
			resized()
			await tick()
			expect(controls.style.top).toBe('356px')
			expect(JSON.parse(localStorage.getItem(key)!).position).toEqual({ x: 712, y: 712 })
			await open()
			height = 44
			resized()
			await tick()
			expect(controls.style.top).toBe('712px')
		}
		await resize(393)
		expect(controls.style.left).toBe('81px')
		await resize(1024)
		expect(controls.style.left).toBe('712px')
	})

	it('drags without toggling, persists its position, and clamps after a resize', async () => {
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			x: 700,
			y: 500,
			left: 700,
			top: 500,
			right: 1000,
			bottom: 700,
			width: 300,
			height: 200,
			toJSON: () => ({})
		})
		const view = render(Overlay, { srcset })
		await tick()
		await open()
		const header = screen.getByRole('button', { name: /Overlay/ })
		const pointer = async (type: string, clientX: number, clientY: number) => {
			const event = new MouseEvent(type, { bubbles: true, clientX, clientY, button: 0 })
			Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } })
			await fireEvent(header, event)
		}
		await pointer('pointerdown', 750, 520)
		await pointer('pointermove', 300, 200)
		await pointer('pointerup', 300, 200)
		await fireEvent.click(header, { detail: 1 })
		expect(header.getAttribute('aria-expanded')).toBe('true')
		const controls = () => document.querySelector('.controls:has(> .tool)') as HTMLElement
		expect(controls().style.left).toBe('250px')
		expect(controls().style.top).toBe('180px')
		view.unmount()
		render(Overlay, { srcset })
		await tick()
		expect(controls().style.left).toBe('250px')
		await resize(393)
		expect(controls().style.left).toBe('81px')
		const restoredHeader = screen.getByRole('button', { name: /Overlay/ })
		await press('Home', {}, restoredHeader)
		expect(controls().style.left).toBe('')
		await fireEvent.click(restoredHeader)
		expect(restoredHeader.getAttribute('aria-expanded')).toBe('false')
	})

	it('starts hidden, exposes the panel, and toggles an actual-size image at 50%', async () => {
		render(Overlay, { srcset })
		await tick()
		expect(image()).toBeNull()
		expect(screen.getByRole('button', { name: /Overlay/ }).getAttribute('aria-expanded')).toBe('false')
		await open()
		expect(screen.getByRole('slider', { name: /Opacity/ })).toBeTruthy()
		await fireEvent.click(screen.getByRole('switch', { name: 'Show Overlay Image' }))
		expect(image()?.getAttribute('src')).toBe('/tablet.jpg')
		expect(image()?.style.width).toBe('1024px')
		expect(image()?.style.opacity).toBe('0.5')
		expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
		await fireEvent.click(screen.getByRole('switch', { name: 'Show Overlay Image' }))
		expect(image()).toBeNull()
	})

	it('keeps independent offsets and pins manual selection across resizing', async () => {
		render(Overlay, { srcset })
		await tick()
		await open()
		await press('ArrowDown', { shiftKey: true })
		await press('ArrowRight', { shiftKey: true, ctrlKey: true })
		expect(x().valueAsNumber).toBe(1)
		expect(y().valueAsNumber).toBe(10)
		await resize(393)
		expect(y().valueAsNumber).toBe(0)
		await press('Digit5')
		expect(image()?.getAttribute('src')).toBe('/mobile.jpg')
		expect(image()?.style.width).toBe('393px')
		await fireEvent.input(y(), { target: { value: '-25' } })
		await resize(1024)
		expect(y().valueAsNumber).toBe(10)
		await fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), { target: { value: '393' } })
		await resize(1920)
		expect(y().valueAsNumber).toBe(-25)
		expect(image()?.getAttribute('src')).toBe('/mobile.jpg')
		await fireEvent.change(screen.getByRole('combobox', { name: 'Offset Step' }), { target: { value: '10' } })
		expect(x().step).toBe('10')
		expect(y().step).toBe('10')
		x().stepDown()
		await fireEvent.input(x())
		expect(x().valueAsNumber).toBe(-10)
		await press('ArrowUp', { shiftKey: true, altKey: true })
		expect(x().valueAsNumber).toBe(0)
		expect(y().valueAsNumber).toBe(0)
		await fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), { target: { value: '1024' } })
		expect(y().valueAsNumber).toBe(10)
	})

	it('persists across remounts and resets everything except whether the image is enabled', async () => {
		const first = render(Overlay, { srcset })
		await tick()
		await open()
		await fireEvent.input(x(), { target: { value: '37' } })
		await press('Digit7')
		first.unmount()
		render(Overlay, { srcset })
		await tick()
		expect(x().valueAsNumber).toBe(37)
		expect(image()?.style.opacity).toBe('0.7')
		await fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), { target: { value: '393' } })
		await fireEvent.input(y(), { target: { value: '-23' } })
		await fireEvent.change(screen.getByRole('combobox', { name: 'Offset Step' }), { target: { value: '10' } })
		await fireEvent.click(screen.getByRole('button', { name: 'Keyboard Shortcuts' }))
		await press('ArrowRight', {}, screen.getByRole('button', { name: /Overlay/ }))
		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
		expect(image()?.style.opacity).toBe('0.5')
		expect(image()?.getAttribute('src')).toBe('/tablet.jpg')
		const key = storageKey('/', configure(srcset))
		expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ ...defaults(), visible: true })
		await open()
		expect(x().valueAsNumber).toBe(0)
		expect(y().valueAsNumber).toBe(0)
		expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('50')
		expect((screen.getByRole('combobox', { name: 'Offset Step' }) as HTMLSelectElement).value).toBe('1')
		expect(screen.getByRole('button', { name: 'Keyboard Shortcuts' }).getAttribute('aria-expanded')).toBe(
			'false'
		)
		await fireEvent.click(screen.getByRole('switch'))
		await fireEvent.input(x(), { target: { value: '9' } })
		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
		expect(image()).toBeNull()
		expect(JSON.parse(localStorage.getItem(key)!)).toEqual(defaults())
	})

	it('isolates routes and source changes, restoring each configuration on return', async () => {
		const view = render(Overlay, { srcset })
		await tick()
		await open()
		await fireEvent.input(y(), { target: { value: '42' } })
		await view.rerender({ srcset: '/different.jpg 1024w' })
		await tick()
		await open()
		expect(y().valueAsNumber).toBe(0)
		await view.rerender({ srcset })
		await tick()
		expect(y().valueAsNumber).toBe(42)
		window.history.pushState({}, '', '/another')
		// SPA route rendering can change the pathname without a popstate event.
		const routeContent = document.createElement('main')
		document.body.append(routeContent)
		await tick()
		await tick()
		await open()
		expect(y().valueAsNumber).toBe(0)
		routeContent.remove()
		window.history.replaceState({}, '', '/')
		await fireEvent(window, new PopStateEvent('popstate'))
		expect(y().valueAsNumber).toBe(42)
	})

	it('handles opacity shortcuts and resets while leaving typing and browser shortcuts alone', async () => {
		render(Overlay, { srcset })
		await tick()
		await open()
		await press('Digit3')
		expect(image()?.style.opacity).toBe('0.3')
		await press('Digit0', { metaKey: true })
		await press('Digit9', {}, x())
		expect(image()?.style.opacity).toBe('0.3')
		const editable = document.createElement('div')
		editable.setAttribute('role', 'textbox')
		document.body.append(editable)
		await press('Digit9', {}, editable)
		expect(image()?.style.opacity).toBe('0.3')
		editable.remove()
		expect((await press('ArrowDown')).defaultPrevented).toBe(false)
		expect((await press('ArrowDown', { shiftKey: true })).defaultPrevented).toBe(true)
		await press('ArrowRight', { shiftKey: true })
		await press('ArrowUp', { shiftKey: true, altKey: true })
		expect(x().valueAsNumber).toBe(0)
		expect(y().valueAsNumber).toBe(0)
		await press('ArrowDown', { shiftKey: true })
		await press('ArrowUp', { shiftKey: true })
		expect(y().valueAsNumber).toBe(0)
		await press('Digit0')
		expect(image()?.style.opacity).toBe('1')
		await press('Digit0')
		expect(image()).toBeNull()
	})

	it('works when storage is blocked and reports image/configuration errors', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked')
		})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const view = render(Overlay, { srcset })
		await tick()
		await press('Digit5')
		await fireEvent.error(image()!)
		expect(screen.getByRole('status').textContent).toBe('Image failed to load')
		await open()
		expect(screen.getByText(/Could not load \/tablet.jpg/).getAttribute('role')).toBe('status')
		await fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), { target: { value: '393' } })
		expect(screen.queryByText(/Could not load/)).toBeNull()
		await view.rerender({ srcset: 'invalid' })
		await tick()
		await open()
		expect(screen.getByText(/No usable design images/).getAttribute('role')).toBe('status')
	})

	it('removes portals and keyboard listeners on unmount', async () => {
		const view = render(Overlay, { srcset })
		await tick()
		await press('Digit5')
		const key = storageKey('/', configure(srcset))
		const saved = localStorage.getItem(key)
		view.unmount()
		expect(document.querySelector('.controls:has(> .tool)')).toBeNull()
		expect(image()).toBeNull()
		expect((await press('ArrowDown', { shiftKey: true })).defaultPrevented).toBe(false)
		expect(localStorage.getItem(key)).toBe(saved)
	})
})
