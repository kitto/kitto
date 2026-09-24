import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import {
	MetalFx,
	MetalText,
	MetalBadge,
	PRESETS,
	BEND,
	BEND_DEFAULTS,
	setBendConfig,
	resetBendConfig,
	GLOW,
	GLOW_DEFAULTS,
	setGlowConfig,
	resetGlowConfig,
	hexToRgb,
	isMetalFxSupported,
	metal_bend,
	useMetalBend,
	metal_text_reflection,
	useMetalTextReflection,
	METAL_TEXT_DEFAULTS,
	METAL_BADGE_DEFAULTS
} from './exports.js'
import { liquidMetalFragmentShader, FRAG_SHADER_SRC, VERT_SHADER_SRC } from './engine/shaders.js'

afterEach(() => cleanup())

const button = createRawSnippet(() => ({ render: () => '<button type="button">Upgrade to Pro</button>' }))

describe('MetalFx', () => {
	it('renders the child as a plain fallback without WebGL2', async () => {
		const { container, getByText } = render(MetalFx, { children: button, class: 'extra', style: 'color: red' })
		await Promise.resolve()
		expect(isMetalFxSupported()).toBe(false)
		expect(getByText('Upgrade to Pro')).toBeTruthy()
		const root = container.querySelector('[data-metal-fx-unsupported]') as HTMLElement
		expect(root).toBeTruthy()
		expect(root.classList.contains('metal-fx-fallback')).toBe(true)
		expect(root.classList.contains('extra')).toBe(true)
		expect(root.querySelector('canvas')).toBeNull()
	})

	it('unmounts cleanly', () => {
		const { unmount, container } = render(MetalFx, { children: button, variant: 'circle', innerShadow: true })
		unmount()
		expect(container.querySelector('.metal-fx-fallback')).toBeNull()
	})
})

describe('MetalText and MetalBadge', () => {
	it('MetalText renders its text without throwing', () => {
		const { getByText } = render(MetalText, { text: 'Pro', font: '500 24px/1.2 sans-serif', color: '#E2E2E2' })
		const span = getByText('Pro')
		expect(span.getAttribute('aria-label')).toBe('Pro')
		expect(span.closest('[data-mfx-bare]')).toBeTruthy()
	})

	it('MetalBadge defaults to "New"', () => {
		const { getByText, unmount } = render(MetalBadge, {})
		expect(getByText('New')).toBeTruthy()
		unmount()
	})
})

describe('attachments', () => {
	it('exposes camelCase aliases', () => {
		expect(useMetalBend).toBe(metal_bend)
		expect(useMetalTextReflection).toBe(metal_text_reflection)
	})

	it('metal_bend attaches and tears down without a canvas', () => {
		const el = document.createElement('div')
		document.body.append(el)
		const svgs = document.body.querySelectorAll('svg').length
		const teardown = metal_bend()(el) as () => void
		expect(document.body.querySelectorAll('svg').length).toBe(svgs + 1)
		teardown()
		expect(document.body.querySelectorAll('svg').length).toBe(svgs)
		el.remove()
	})

	it('metal_text_reflection marks the element as text', () => {
		const el = document.createElement('span')
		const teardown = metal_text_reflection()(el) as () => void
		expect(el.hasAttribute('data-metal-fx-text')).toBe(true)
		teardown()
	})
})

describe('engine config', () => {
	it('ships the three presets with dark and light modes', () => {
		for (const name of ['chromatic', 'silver', 'gold'] as const) {
			expect(PRESETS[name].modes.dark).toBeTruthy()
			expect(PRESETS[name].modes.light).toBeTruthy()
		}
	})

	it('bend and glow configs patch and reset', () => {
		setBendConfig({ strength: 2 })
		expect(BEND.strength).toBe(2)
		resetBendConfig()
		expect(BEND.strength).toBe(BEND_DEFAULTS.strength)
		const key = Object.keys(GLOW_DEFAULTS)[0] as keyof typeof GLOW
		setGlowConfig({ [key]: 123 } as Partial<typeof GLOW>)
		expect(GLOW[key]).toBe(123)
		resetGlowConfig()
		expect(GLOW[key]).toBe(GLOW_DEFAULTS[key])
	})

	it('parses hex colours', () => {
		expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0])
	})

	it('keeps upstream defaults', () => {
		expect(METAL_TEXT_DEFAULTS.shaderScale).toBe(2.8)
		expect(METAL_BADGE_DEFAULTS.core).toEqual({ r: 46, blur: 100, a: 0.94, size: 49 })
	})
})

describe('vendored shader', () => {
	it('starts with #version and is the fragment stage', () => {
		expect(liquidMetalFragmentShader.startsWith('#version 300 es')).toBe(true)
		expect(VERT_SHADER_SRC.startsWith('#version 300 es')).toBe(true)
		expect(FRAG_SHADER_SRC).toBe(liquidMetalFragmentShader)
		// Helper chunks are interpolated, not left as placeholders.
		expect(liquidMetalFragmentShader).not.toContain('${')
		expect(liquidMetalFragmentShader).toContain('float snoise(vec2 v)')
		expect(liquidMetalFragmentShader.length).toBe(11450)
	})
})
