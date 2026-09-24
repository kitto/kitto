import { onDestroy, untrack } from 'svelte'
import { getAudioContext } from './audio.js'

export type MicrophoneState = 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported' | 'error'

export interface UseMicrophoneOptions {
	/**
	 * Extra `getUserMedia` audio constraints. The defaults turn the browser's
	 * voice processing off (echo cancellation, noise suppression, auto gain)
	 * so the beam sees the real dynamics of the voice rather than a levelled
	 * signal; pass `{}` to keep the browser defaults.
	 */
	constraints?: MediaTrackConstraints
	/** Ask for the microphone on mount rather than waiting for `start()`. */
	autoStart?: boolean
}

export interface UseMicrophoneResult {
	/** The live stream to hand to `<VoiceBeam stream={…}>`, or null. Reactive. */
	readonly stream: MediaStream | null
	/** Reactive. */
	readonly state: MicrophoneState
	/** The error behind a 'denied' / 'error' state, if any. Reactive. */
	readonly error: Error | null
	/** True when this browser can capture audio at all. */
	readonly supported: boolean
	/** Request the microphone. Call it from a click so Safari lets audio start. */
	start: () => Promise<MediaStream | null>
	/** Stop every track and drop the stream. */
	stop: () => void
}

const DEFAULT_CONSTRAINTS: MediaTrackConstraints = {
	echoCancellation: false,
	noiseSuppression: false,
	autoGainControl: false
}

function isSupported(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		typeof navigator.mediaDevices !== 'undefined' &&
		typeof navigator.mediaDevices.getUserMedia === 'function'
	)
}

/**
 * @module use_microphone
 * @group Effects
 * @version 0.2.1
 * @remarks
 * Microphone access for {@link VoiceBeam}, ported from `useMicrophone` in voice-glow. Call it
 * during component initialisation to get a reactive controller: `stream`, `state` and `error`
 * update as the request resolves, so read them straight off the object (don't destructure).
 *
 * It calls `getUserMedia` with echo cancellation, noise suppression and auto gain turned off,
 * so the glow sees the real dynamics of the voice. The stream is stopped when the owning
 * component is destroyed, and when the browser ends the track (device unplugged, permission
 * revoked) the state falls back to `'idle'`. Call `start()` from a user gesture.
 *
 * Also exported as `useMicrophone`.
 *
 * @param options - `constraints` merged over the defaults, and `autoStart`
 * @returns A reactive microphone controller
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { VoiceBeam, use_microphone } from 'kitto/effects'
 *
 *   const mic = use_microphone()
 * </script>
 *
 * <VoiceBeam stream={mic.stream}>
 *   <div class="composer">…</div>
 * </VoiceBeam>
 *
 * <button onclick={mic.state === 'live' ? mic.stop : mic.start} aria-pressed={mic.state === 'live'}>
 *   {mic.state === 'live' ? 'Stop' : 'Listen'}
 * </button>
 * ```
 */
export function use_microphone(options: UseMicrophoneOptions = {}): UseMicrophoneResult {
	const { constraints, autoStart = false } = options
	let stream = $state.raw<MediaStream | null>(null)
	let state = $state<MicrophoneState>(isSupported() ? 'idle' : 'unsupported')
	let error = $state.raw<Error | null>(null)
	// The non-reactive handle, so a pending request and teardown agree on the live stream.
	let current: MediaStream | null = null
	let destroyed = false

	const release = () => {
		const s = current
		current = null
		if (s) s.getTracks().forEach(t => t.stop())
	}

	const stop = () => {
		release()
		stream = null
		state = isSupported() ? 'idle' : 'unsupported'
	}

	const start = async (): Promise<MediaStream | null> => {
		if (!isSupported()) {
			state = 'unsupported'
			return null
		}
		if (current) return current

		// Create (and resume) the shared context inside the gesture that
		// triggered this, while the browser still allows it.
		getAudioContext()

		state = 'requesting'
		error = null
		try {
			const next = await navigator.mediaDevices.getUserMedia({
				audio: { ...DEFAULT_CONSTRAINTS, ...(constraints ?? {}) }
			})
			if (destroyed) {
				next.getTracks().forEach(t => t.stop())
				return null
			}
			current = next
			stream = next
			state = 'live'
			const onEnded = () => {
				if (current !== next) return
				current = null
				stream = null
				state = 'idle'
			}
			next.getAudioTracks().forEach(t => t.addEventListener('ended', onEnded))
			return next
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e))
			error = err
			state = err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'denied' : 'error'
			return null
		}
	}

	// Tie teardown (and autoStart) to the owning component, when there is one.
	try {
		onDestroy(() => {
			destroyed = true
			release()
		})
		if (autoStart && typeof window !== 'undefined') {
			$effect(() => {
				untrack(() => void start())
			})
		}
	} catch {
		/* Called outside component initialisation: the caller owns stop(). */
	}

	return {
		get stream() {
			return stream
		},
		get state() {
			return state
		},
		get error() {
			return error
		},
		get supported() {
			return isSupported()
		},
		start,
		stop
	}
}

/** Alias of {@link use_microphone}. */
export const useMicrophone = use_microphone
