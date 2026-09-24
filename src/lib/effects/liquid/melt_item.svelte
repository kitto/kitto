<!--
	Host for one melting item: keeps the child interactive but invisible —
	the melt SVG is the painter. Auto-detects the image source from the
	first <img> descendant when `src` isn't given.
-->
<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'
	import type { ImageMeltOptions, ImageMeltRegistry } from './image_melt.js'

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		src?: string
		opts: Required<ImageMeltOptions>
		registry: ImageMeltRegistry
		children?: Snippet
	}

	let { src, opts, registry, children, style, ...rest }: Props = $props()

	let host = $state<HTMLSpanElement>()

	$effect(() => {
		const target = host?.firstElementChild as HTMLElement | null
		if (!target) return
		const img = src ?? target.querySelector('img')?.src ?? (target as HTMLImageElement).src
		if (!img) {
			console.warn(
				'[liquid-gooey] effect="melt" needs an image: pass melt={{ src }} or put an <img> inside the item.'
			)
			return
		}
		// The DOM element stays for layout + interaction; the SVG paints it.
		const prevOpacity = target.style.opacity
		target.style.opacity = '0'
		const unregister = registry.register({ el: target, src: img, opts })
		return () => {
			target.style.opacity = prevOpacity
			unregister()
		}
	})
</script>

<span {...rest} bind:this={host} style="display: contents;{style ? ` ${style}` : ''}">{@render children?.()}</span>
