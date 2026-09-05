export type WardenVoiceIntent =
	| 'EXPLAIN_CONTEXT'
	| 'REDUCE_DISTRACTION'
	| 'FOCUS_MODE'
	| 'RESUME_WARDENFM'
	| 'PAUSE_MEDIA'
	| 'NEXT_MEDIA'
	| 'PREVIOUS_MEDIA'
	| 'SELECT_CONTEXT_PROFILE'
	| 'CANCEL'

export type NormalizedVoiceIntent = WardenVoiceIntent | 'NO_ACTION'

export type VoiceIntentCandidate = {
	intent: string
	confidence: number
	threshold: number
	sourceRef: string
	sessionRef: string
}

export type VoiceIntentResult = {
	intent: NormalizedVoiceIntent
	confidence: number
	sourceRef: string
	sessionRef: string
}

const ALLOWED = new Set<WardenVoiceIntent>([
	'EXPLAIN_CONTEXT',
	'REDUCE_DISTRACTION',
	'FOCUS_MODE',
	'RESUME_WARDENFM',
	'PAUSE_MEDIA',
	'NEXT_MEDIA',
	'PREVIOUS_MEDIA',
	'SELECT_CONTEXT_PROFILE',
	'CANCEL',
])

export function normalizeVoiceIntentCandidate(
	candidate: VoiceIntentCandidate,
): VoiceIntentResult {
	const admitted =
		candidate.confidence >= candidate.threshold &&
		ALLOWED.has(candidate.intent as WardenVoiceIntent)

	return {
		intent: admitted ? (candidate.intent as WardenVoiceIntent) : 'NO_ACTION',
		confidence: candidate.confidence,
		sourceRef: candidate.sourceRef,
		sessionRef: candidate.sessionRef,
	}
}
