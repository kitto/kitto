// Ported from thinking-orbs 0.3.2 in Libraries.dev by Jakub Antalik (MIT).
// https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs

export { default as ThinkingOrb } from './index.svelte'

export type { ThinkingOrbProps, OrbState, OrbSize, OrbTheme } from './types.js'

// Power-user surface: the resolved presets + raw frame painters, for
// consumers driving their own canvas outside Svelte.
export {
	resolvePreset,
	STATE_TO_MODE,
	PRESETS as ORB_PRESETS,
	type ModeKey,
	type Resolved,
	type Preset as OrbPreset
} from './presets.js'
export { MODE_DRAWS, MODE_FRAMES } from './engine/registry.js'
export { countDots, scaleCounts, scaleRadii, BASE_PROFILES } from './engine/profiles.js'
// The geometry toolkit the built-in modes are written with, so a custom
// `frame` can be built from the same parts.
export {
	finalizeFrame,
	makeProj,
	radiusScale,
	fibDir,
	hashD,
	vnoise,
	lerp,
	frac,
	angleDelta,
	paintFrame,
	paint,
	paintLines,
	type OrbTint,
	type Projector
} from './engine/core.js'
export type { ModeFrame, ModeDraw, ModeOpts, OrbFrame, Dot, Line } from './engine/index.js'
export { parseTint } from './tint.js'
// Gravity: the orb pulls the pointer in. The sprite has to be the
// platform's real pointer, so the consumer supplies it.
export {
	attachGravity,
	setGravitySprite,
	setGravityConfig,
	getGravityConfig,
	getGravityStatus,
	resetGravity,
	GRAVITY_DEFAULTS
} from './gravity.js'
export type { GravityOptions, CursorSprite as GravityCursorSprite } from './gravity.js'
