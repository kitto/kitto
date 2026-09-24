// Theme resolution: explicit prop → ancestor data-theme/.dark|.light
// class (watched live) → prefers-color-scheme (subscribed live).
// SSR-safe: nothing here runs until called from an effect; the pre-mount
// fallback is dark.

import type { OrbTheme } from './types.js'

/** Nearest ancestor `data-theme="dark|light"` or `.dark` / `.light` class; `null` when none. */
export function ancestorTheme(el: Element | null): boolean | null {
	let node: Element | null = el
	while (node) {
		const attr = node.getAttribute('data-theme')
		if (attr === 'dark') return true
		if (attr === 'light') return false
		if (node.classList.contains('dark')) return true
		if (node.classList.contains('light')) return false
		node = node.parentElement
	}
	return null
}

function systemDark(): boolean {
	return typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Resolve the effective dark/light substrate for a mounted element and keep
 * reporting it as ancestors or the OS theme change. Returns the teardown.
 */
export function watchResolvedDark(theme: OrbTheme, host: Element, set: (dark: boolean) => void): () => void {
	if (theme === 'dark') {
		set(true)
		return () => {}
	}
	if (theme === 'light') {
		set(false)
		return () => {}
	}

	const resolve = () => set(ancestorTheme(host) ?? systemDark())
	resolve()

	// live OS/browser theme switches
	const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null
	mq?.addEventListener('change', resolve)

	// live app-level toggles: watch class/data-theme flips on ancestors
	let mo: MutationObserver | null = null
	if (typeof MutationObserver !== 'undefined') {
		mo = new MutationObserver(resolve)
		mo.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'data-theme'],
			subtree: true
		})
	}

	return () => {
		mq?.removeEventListener('change', resolve)
		mo?.disconnect()
	}
}

/** Live `prefers-reduced-motion` — reduced users get a static frame. Returns the teardown. */
export function watchReducedMotion(set: (reduced: boolean) => void): () => void {
	if (typeof matchMedia === 'undefined') return () => {}
	const mq = matchMedia('(prefers-reduced-motion: reduce)')
	set(mq.matches)
	const on = (e: MediaQueryListEvent) => set(e.matches)
	mq.addEventListener('change', on)
	return () => mq.removeEventListener('change', on)
}
