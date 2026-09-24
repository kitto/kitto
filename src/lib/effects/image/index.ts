/**
 * Ported from img-fx 0.5.1 in Libraries.dev by Jakub Antalik (MIT, Copyright (c) 2026 Jakub Antalik).
 *
 * Shipped as its own entry point, `kitto/effects/image`, because it depends on `three`.
 */
export { default as ImageGeneration } from './image_generation.svelte'

export type {
	ImageGenerationCycleEvent,
	ImageGenerationHandle,
	ImageGenerationPreset,
	ImageGenerationProps,
	ImageGenerationTheme
} from './types.js'

export {
	PRESETS,
	hexToRgb,
	parseCssColor,
	type EasingKey,
	type MaskShape,
	type MosaicConfig,
	type Preset,
	type PresetMode,
	type PresetName,
	type PresetTheme,
	type RevealConfig
} from './presets/index.js'

// Power-user surface: the engine primitives, to drive the renderer + reveal pipeline without the component.
export {
	createCycle,
	createInstance,
	createReveal,
	destroyInstance,
	ease,
	effectiveCardBg,
	getFrameRate,
	getMaxDpr,
	loadImage,
	pickRandomImage,
	samplePaletteFromCanvas,
	setFrameRate,
	setInstanceCardBg,
	setInstanceColors,
	setInstancePaused,
	setInstancePreset,
	setInstanceStrength,
	setInstanceVisible,
	setMaxDpr,
	setSharedFragmentShader,
	IMAGE_FRAGMENT_SHADER,
	updateInstanceSize,
	type CreateInstanceOptions,
	type CreateRevealOptions,
	type Cycle,
	type CycleEvent,
	type CycleOptions,
	type CyclePhase,
	type EaseFn,
	type Instance,
	type RevealState,
	type RevealStartOptions,
	type SampledPalette
} from './engine/index.js'
