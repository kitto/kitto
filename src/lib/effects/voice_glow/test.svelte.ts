import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import { createRawSnippet, flushSync } from 'svelte'
import VoiceBeam from './index.svelte'
import { parseRgb, toTriple } from './color.js'
import { resolveVoiceDefaults, resolveVoiceStyle, voiceDefaults } from './presets.js'
import { use_microphone, useMicrophone } from './microphone.svelte.js'

const card = createRawSnippet(() => ({
	render: () => '<div class="card" style="border-top-left-radius: 12px">Content</div>'
}))

// jsdom has no 2D canvas; stub it to null (as without the canvas package) to keep the output quiet.
beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('VoiceBeam', () => {
	it('renders children, its layers and a scoped stylesheet without canvas support', () => {
		const { container, unmount } = render(VoiceBeam, { children: card, class: 'wrap', id: 'x', level: 0.5 })
		const root = container.querySelector('[data-voice-beam]') as HTMLElement
		const id = root.dataset.voiceBeam!
		expect(root.querySelector('.card')?.textContent).toBe('Content')
		expect(root.querySelector('[data-voice-beam-bloom]')).not.toBeNull()
		expect(root.querySelector('[data-voice-beam-band]')).not.toBeNull()
		expect(root.querySelector(`filter#vb-distort-${id}`)).not.toBeNull()
		expect(root.hasAttribute('data-active')).toBe(true)
		expect(root.dataset.voiceType).toBe('default')
		expect(root.className).toBe('wrap')
		expect(root.id).toBe('x')
		expect(root.style.getPropertyValue('--voice-strength')).toBe('1')
		const style = container.querySelector('style')!
		expect(style.textContent).toContain(`[data-voice-beam="${id}"]`)
		flushSync()
		expect(style.textContent).toContain('12px')
		expect(() => unmount()).not.toThrow()
	})

	it('reflects processing, paused and css hooks', () => {
		const { container } = render(VoiceBeam, {
			children: card,
			processing: true,
			paused: true,
			strength: 3,
			css: '[data-voice-beam="{id}"] { color: red }'
		})
		const root = container.querySelector('[data-voice-beam]') as HTMLElement
		expect(root.hasAttribute('data-processing')).toBe(true)
		expect(root.hasAttribute('data-paused')).toBe(true)
		expect(root.style.getPropertyValue('--voice-strength')).toBe('1')
		expect(container.querySelector('style')!.textContent).toContain(
			`[data-voice-beam="${root.dataset.voiceBeam}"] { color: red }`
		)
	})

	it('renders every type and theme, and drops the warp when distortion is 0', () => {
		for (const type of ['default', 'pill', 'mobile'] as const) {
			for (const theme of ['dark', 'light', 'auto'] as const) {
				const { unmount } = render(VoiceBeam, {
					children: card,
					type,
					theme,
					colorVariant: 'ocean',
					level: () => 0.4
				})
				unmount()
			}
		}
		const { container } = render(VoiceBeam, { children: card, distortion: 0 })
		expect(container.querySelector('[data-voice-beam-warp]')).toBeNull()
		expect(container.querySelector('svg filter')).toBeNull()
	})
})

describe('colour parsing', () => {
	it('parses hex and rgb forms', () => {
		expect(parseRgb('#fff')).toEqual([255, 255, 255])
		expect(parseRgb(' #10a0Ff ')).toEqual([16, 160, 255])
		expect(parseRgb('rgba(1, 2.4, 3, 0.5)')).toEqual([1, 2, 3])
		expect(parseRgb('red')).toBeNull()
		expect(toTriple('#000000')).toBe('0, 0, 0')
	})
})

describe('presets', () => {
	it('layers type and theme over the defaults', () => {
		expect(resolveVoiceDefaults()).toEqual(voiceDefaults)
		expect(resolveVoiceDefaults('pill').scale).toBe(0.45)
		const light = resolveVoiceDefaults('default', 'light')
		expect([light.reach, light.spread, light.coreLight, light.bandStrength]).toEqual([1.8, 0.8, 1.8, 1.7])
		expect(resolveVoiceDefaults('mobile', 'light').reach).toBe(3)
		expect(resolveVoiceStyle('pill', 'light')).toEqual({})
		expect(resolveVoiceStyle('mobile')).toEqual({ strength: 1, brightness: 1.2, saturation: 1.5 })
	})
})

describe('use_microphone', () => {
	it('is aliased and reports unsupported without getUserMedia', async () => {
		expect(useMicrophone).toBe(use_microphone)
		vi.stubGlobal('navigator', { ...navigator, mediaDevices: undefined })
		const mic = use_microphone()
		expect(mic.supported).toBe(false)
		expect(mic.state).toBe('unsupported')
		expect(await mic.start()).toBeNull()
	})

	it('goes live, stops its tracks, and maps a refusal to denied', async () => {
		const track = { stop: vi.fn(), addEventListener: vi.fn() }
		const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream
		const getUserMedia = vi.fn().mockResolvedValue(stream)
		vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })

		const mic = use_microphone({ constraints: { echoCancellation: true } })
		expect(mic.state).toBe('idle')
		const started = mic.start()
		expect(mic.state).toBe('requesting')
		expect(await started).toBe(stream)
		expect(mic.state).toBe('live')
		expect(mic.stream).toBe(stream)
		expect(getUserMedia.mock.calls[0][0].audio).toEqual({
			echoCancellation: true,
			noiseSuppression: false,
			autoGainControl: false
		})
		mic.stop()
		expect(track.stop).toHaveBeenCalled()
		expect(mic.stream).toBeNull()
		expect(mic.state).toBe('idle')

		const refusal = Object.assign(new Error('no'), { name: 'NotAllowedError' })
		getUserMedia.mockRejectedValueOnce(refusal)
		expect(await mic.start()).toBeNull()
		expect(mic.state).toBe('denied')
		expect(mic.error).toBe(refusal)
	})
})
