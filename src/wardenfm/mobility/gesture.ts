import type { NormalizedVoiceIntent } from './voice-intent'

export type WardenGestureToken =
	| 'PALM_STOP'
	| 'SWIPE_RIGHT'
	| 'SWIPE_LEFT'
	| 'THUMBS_UP'
	| 'CLOSED_HAND_CANCEL'
	| 'POINT_HOLD_CONFIRM'
	| 'UNKNOWN'

export type GestureCandidate = {
	token: string
	confidence: number
	threshold: number
	sourceRef: string
	sessionRef: string
}

export type GestureResult = {
	token: WardenGestureToken
	confidence: number
	sourceRef: string
	sessionRef: string
}

const TOKENS = new Set<WardenGestureToken>([
	'PALM_STOP',
	'SWIPE_RIGHT',
	'SWIPE_LEFT',
	'THUMBS_UP',
	'CLOSED_HAND_CANCEL',
	'POINT_HOLD_CONFIRM',
	'UNKNOWN',
])

export function normalizeGestureCandidate(
	candidate: GestureCandidate,
): GestureResult {
	const valid =
		candidate.confidence >= candidate.threshold &&
		TOKENS.has(candidate.token as WardenGestureToken)

	return {
		token: valid ? (candidate.token as WardenGestureToken) : 'UNKNOWN',
		confidence: candidate.confidence,
		sourceRef: candidate.sourceRef,
		sessionRef: candidate.sessionRef,
	}
}

export function gestureIntent(
	token: WardenGestureToken,
): NormalizedVoiceIntent {
	switch (token) {
		case 'PALM_STOP':
			return 'PAUSE_MEDIA'
		case 'SWIPE_RIGHT':
			return 'NEXT_MEDIA'
		case 'SWIPE_LEFT':
			return 'PREVIOUS_MEDIA'
		case 'CLOSED_HAND_CANCEL':
			return 'CANCEL'
		default:
			return 'NO_ACTION'
	}
}

export function isStepUpConfirmation(
	token: WardenGestureToken,
	trustedDigitalMeSession: boolean,
): boolean {
	if (!trustedDigitalMeSession) return false
	return token === 'THUMBS_UP' || token === 'POINT_HOLD_CONFIRM'
}
