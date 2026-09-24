import { createContext } from 'svelte'
import type { ImageMeltRegistry } from './image_melt.js'
import type { ObserveEngine } from './observer.js'

export interface GooeyContextValue {
	/** Silhouette group inside the goo-filtered svg. `null` until the group mounts. Reactive. */
	readonly portal: SVGGElement | null
	/** Portal target inside the melt-overlay svg (above the content layer). Reactive. */
	readonly meltPortal: SVGGElement | null
	/** The group's liquid fill — default colour of the intruding mix liquid. Reactive. */
	readonly fill: string
	getGroup: () => HTMLDivElement | null
	engine: ObserveEngine
	/** Pairwise image-melt items (effect="melt") register here. */
	imageMelt: ImageMeltRegistry
}

const [get, set, has] = createContext<GooeyContextValue>()

export const set_gooey_context = set

export function get_gooey_context(): GooeyContextValue {
	if (!has()) throw new Error('<Gooey.Item> must be rendered inside a <Gooey> group.')
	return get()
}
