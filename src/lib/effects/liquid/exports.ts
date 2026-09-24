// Ported from liquid-gooey 0.2.2 in Libraries.dev by Jakub Antalik (MIT).
// https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/liquid-gooey

import Root from './index.svelte'
import Item from './item.svelte'

/** The liquid group: renders the merged silhouette (goo + real shadows) behind
 *  your crisp content. Put `Liquid.Item`s inside. */
export const Liquid: typeof Root & { Item: typeof Item } = Object.assign(Root, { Item })
export { default as LiquidItem } from './item.svelte'

export type { LiquidProps, LiquidItemProps } from './types.js'
export type { BendTuning, DissolveOptions, LiquidEffect, MorphTuning, MoveTuning } from './tuning.js'
export { IMAGE_MELT_DEFAULTS } from './image_melt.js'
export type { ImageMeltOptions } from './image_melt.js'

// ---- advanced escape hatch (raw engine options + defaults) ----
export { EVOLVE_DEFAULTS, MOVE_DEFAULTS } from './observer.js'
export type { EvolveOptions, MoveOptions } from './observer.js'
export { easingFunction, presets } from './spring.js'
export type { SpringConfig, Transition, TransitionPreset } from './spring.js'
export type { CornerRadii } from './geometry.js'
