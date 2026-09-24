// Ported from metal-fx 2.0.11 in Libraries.dev by Jakub Antalik (MIT).
// Includes Paper Shaders' liquidMetal shader (@paper-design/shaders 0.0.80, Apache-2.0), vendored
// unmodified in engine/shaders.ts — see NOTICE.md.
export { default as MetalFx } from './index.svelte'
export { default as MetalText } from './text.svelte'
export { default as MetalBadge } from './badge.svelte'
export { METAL_TEXT_DEFAULTS, type TextInnerShadow } from './text_shadow.js'
export { METAL_BADGE_DEFAULTS, type MetalBadgeCore } from './badge_config.js'
export { metal_bend, useMetalBend } from './bend.js'
export { BEND, BEND_DEFAULTS, setBendConfig, resetBendConfig, type BendConfig } from './engine/bend/config.js'
export { metal_text_reflection, useMetalTextReflection } from './text_reflection.js'
export { paintTextRun, textMaskDataUrl } from './engine/text_mask.js'

export type {
	MetalFxProps,
	MetalFxVariant,
	MetalFxTheme,
	MetalFxPreset,
	MetalFxReflectionTarget,
	MetalFxInnerShadow
} from './types.js'

// Power-user surface: expose the engine primitives so consumers building
// non-Svelte integrations can drive the same renderer.
export {
	PRESETS,
	SHAPE_NONE,
	SHAPE_CIRCLE,
	SHAPE_DAISY,
	SHAPE_DIAMOND,
	SHAPE_METABALLS,
	FIT_NONE,
	FIT_CONTAIN,
	FIT_COVER,
	hexToRgb,
	hexToRgba,
	type Preset,
	type PresetMode,
	type PresetName,
	type PresetTheme
} from './engine/presets.js'

export {
	createInstance,
	destroyInstance,
	updateInstance,
	setSharedPreset,
	setSharedPresetMode,
	getSharedPreset,
	setInstanceDeform,
	redrawInstance,
	pauseShared,
	resumeShared
} from './engine/renderer/loop.js'

export type { MetalFxInstance, DeformFn, DeformLayers, MaskFn } from './engine/renderer/core.js'
export { RIM_DEFAULTS, type RimOptions } from './engine/rim.js'
export { isMetalFxSupported } from './engine/renderer/core.js'

// Live glow tuning — mutable singleton read by the glow engine every frame.
export {
	GLOW,
	GLOW_DEFAULTS,
	GLOW_MARKUP_KEYS,
	setGlowConfig,
	resetGlowConfig,
	subscribeGlowConfig,
	type GlowConfig
} from './engine/glow/config.js'

// Cursor light: glint under the pointer + catch-light facing it.
export {
	CURSOR_LIGHT,
	CURSOR_LIGHT_DEFAULTS,
	setCursorLightConfig,
	resetCursorLightConfig,
	setCursorSprite,
	type CursorLightConfig,
	type CursorSprite
} from './engine/cursor/light.js'

// Cursor-as-occluder for proximity reflections.
export {
	REFLECTION_OCCLUDER,
	REFLECTION_OCCLUDER_DEFAULTS,
	setReflectionOccluderConfig,
	resetReflectionOccluderConfig,
	type ReflectionOccluderConfig
} from './engine/reflection/paint.js'
