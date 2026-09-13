export interface Source {
	id: string
	src: string
	width: number
}

export interface Configuration {
	mode: 'srcset' | 'legacy'
	sources: Source[]
	warnings: string[]
}

export interface Settings {
	visible: boolean
	opacity: number
	selection: string
	expanded: boolean
	offsets: Record<string, { x: number; y: number }>
	position: { x: number; y: number } | null
}

export function defaults(): Settings {
	return { visible: false, opacity: 50, selection: 'auto', expanded: false, offsets: {}, position: null }
}

export function clampPosition(
	position: { x: number; y: number },
	viewport: { width: number; height: number },
	size: { width: number; height: number }
) {
	return {
		x: Math.max(12, Math.min(position.x, viewport.width - size.width - 12)),
		y: Math.max(12, Math.min(position.y, viewport.height - size.height - 12))
	}
}

export function configure(srcset?: string, mobile?: string, desktop?: string): Configuration {
	const configuration: Configuration = {
		mode: srcset !== undefined ? 'srcset' : 'legacy',
		sources: [],
		warnings: []
	}
	const { sources, warnings } = configuration
	if (srcset !== undefined) {
		for (const entry of srcset.split(',')) {
			const match = entry.trim().match(/^(\S+)\s+([1-9]\d*)w$/)
			const width = Number(match?.[2])
			if (!match || !Number.isSafeInteger(width)) {
				warnings.push(
					`Invalid source: "${entry.trim()}". Use an image URL followed by a positive integer width, e.g. /design.jpg 1920w.`
				)
				continue
			}
			if (sources.some(source => source.width === width)) {
				warnings.push(`Duplicate design width ${width}w; keeping the first source.`)
				continue
			}
			sources.push({ id: String(width), src: match[1], width })
		}
		sources.sort((a, b) => a.width - b.width)
	} else {
		for (const [id, value, fallback] of [
			['mobile', mobile ?? desktop, 393],
			['desktop', desktop ?? mobile, 1920]
		] as const) {
			if (!value) continue
			const match = value.match(/^(.*)@(\d+)$/)
			const width = match ? Number(match[2]) : fallback
			if (!Number.isSafeInteger(width) || width <= 0) {
				warnings.push(`Invalid ${id} design width.`)
				continue
			}
			sources.push({ id, src: match ? match[1] : value, width })
		}
	}
	if (!sources.length)
		warnings.push('No usable design images. Provide srcset="/design.jpg 1920w" or a mobile/desktop prop.')
	return configuration
}

export function select(configuration: Configuration, viewport: number, selection = 'auto'): Source | undefined {
	const pinned = configuration.sources.find(source => source.id === selection)
	if (pinned) return pinned
	if (configuration.mode === 'legacy') {
		return (
			configuration.sources.find(source => source.id === (viewport < 640 ? 'mobile' : 'desktop')) ??
			configuration.sources[0]
		)
	}
	return configuration.sources.reduce<Source | undefined>((closest, source) => {
		if (!closest) return source
		const distance = Math.abs(source.width - viewport)
		const previous = Math.abs(closest.width - viewport)
		return distance < previous || (distance === previous && source.width > closest.width) ? source : closest
	}, undefined)
}

export function storageKey(pathname: string, configuration: Configuration): string {
	return `kitto:overlay:v2:${JSON.stringify([pathname, configuration.mode, configuration.sources])}`
}

export function restore(raw: string | null, configuration: Configuration): Settings {
	const result = defaults()
	try {
		const value = JSON.parse(raw ?? 'null')
		if (!value || typeof value !== 'object') return result
		if (typeof value.visible === 'boolean') result.visible = value.visible
		if (typeof value.expanded === 'boolean') result.expanded = value.expanded
		if (value.position && Number.isFinite(value.position.x) && Number.isFinite(value.position.y))
			result.position = { x: value.position.x, y: value.position.y }
		if (typeof value.opacity === 'number' && Number.isFinite(value.opacity))
			result.opacity = Math.max(0, Math.min(100, value.opacity))
		if (configuration.sources.some(source => source.id === value.selection)) result.selection = value.selection
		for (const source of configuration.sources) {
			const offset = value.offsets?.[source.width]
			if (offset && Number.isFinite(offset.x) && Number.isFinite(offset.y))
				result.offsets[source.width] = { x: offset.x, y: offset.y }
		}
	} catch {
		/* Corrupt or old state starts fresh. */
	}
	return result
}
