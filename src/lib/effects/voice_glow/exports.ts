/**
 * Ported from voice-glow v0.2.1 in Libraries.dev by Jakub Antalik (MIT).
 * https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/voice-glow
 */
export { default as VoiceBeam } from './index.svelte'

export { use_microphone, useMicrophone } from './microphone.svelte.js'
export type { UseMicrophoneOptions, UseMicrophoneResult, MicrophoneState } from './microphone.svelte.js'

export { getAudioContext, isAudioSupported } from './audio.js'
export { parseRgb } from './color.js'

export {
	voiceDefaults,
	voiceTypePresets,
	voiceTypeStyle,
	resolveVoiceDefaults,
	resolveVoiceStyle
} from './presets.js'
export type { VoiceGeometry, VoiceTypeStyle } from './presets.js'

export type {
	VoiceBeamProps,
	VoiceBeamType,
	VoiceBeamTheme,
	VoiceBeamColorVariant,
	VoiceBeamLevel,
	VoiceThemeColors
} from './types.js'

export { themePresets, voicePalettes, voiceLobes, LOBE_SPACING, LOBE_SPAN } from './styles.js'
export type { VoiceLobe } from './styles.js'
