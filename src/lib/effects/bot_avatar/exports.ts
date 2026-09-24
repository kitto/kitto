/* Ported from bot-avatars 0.1.1 in Libraries.dev by Jakub Antalik (MIT).
   https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/bot-avatars */

export { default as BotAvatar } from './index.svelte'

export { botAvatarPresets, botAvatarPalette, botAvatarTypes, botAvatarFaces, botAvatarStates } from './presets.js'
export { SHAPE_PATHS as botAvatarShapes, SHAPE_PARTS as botAvatarParts } from './shapes.js'
export { autoInk, luminance, parseColor, shade } from './color.js'
export { Sim as BotAvatarSim, restPose } from './engine.js'
export { draw as drawBotAvatarFrame, OVERSCAN as BOT_AVATAR_OVERSCAN, RISE as BOT_AVATAR_RISE } from './draw.js'
export { warmPlastic as warmBotAvatarPlastic } from './plastic.js'
/* the plastic material's building blocks, for renderers on other canvases */
export {
	buildForm as bakeBotAvatarForm,
	buildMatcap as buildBotAvatarMatcap,
	shadeTexels as shadeBotAvatarTexels,
	capFrame as botAvatarCapFrame,
	tierFor as botAvatarTier,
	PAD as BOT_AVATAR_PAD,
	SPAN as BOT_AVATAR_SPAN,
	MATCAP_SIZE as BOT_AVATAR_MATCAP_SIZE
} from './plastic.js'
export type {
	Form as BotAvatarForm,
	Frame as BotAvatarFrame,
	Material as BotAvatarMaterial,
	Rig as BotAvatarRig
} from './plastic.js'
export { JUMP_DEFAULTS as botAvatarJumpDefaults } from './engine.js'
export type { JumpConfig as BotAvatarJumpConfig } from './engine.js'
export type { DrawConfig as BotAvatarDrawConfig } from './draw.js'
export type { Pose as BotAvatarPose } from './engine.js'

export type {
	BotAvatarProps,
	BotAvatarType,
	BotAvatarFace,
	BotAvatarState,
	BotAvatarShading,
	BotAvatarPreset
} from './types.js'
