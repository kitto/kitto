// Ported from border-beam 1.4.1 in Libraries.dev by Jakub Antalik (MIT).
export { default as BorderBeam } from './index.svelte'
export type {
	BorderBeamProps,
	BorderBeamSize,
	BorderBeamTheme,
	BorderBeamColorVariant,
	SizeConfig,
	ThemeColors
} from './types.js'
export { sizePresets, sizeThemePresets, themeColors, generateBeamCSS, getPulseDriverConfig } from './styles.js'
export type { PulseDriverConfig, GenerateStylesOptions } from './styles.js'
export { registerPulseInstance } from './pulse_driver.js'
