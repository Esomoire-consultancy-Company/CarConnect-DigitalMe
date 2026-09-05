import {
	gestureIntent,
	isStepUpConfirmation,
	normalizeGestureCandidate,
} from '../mobility/gesture'

describe('Warden gesture grammar', () => {
	it('maps an admitted swipe to next media intent', () => {
		const result = normalizeGestureCandidate({
			token: 'SWIPE_RIGHT',
			confidence: 0.95,
			threshold: 0.8,
			sourceRef: 'gesture-1',
			sessionRef: 'session-1',
		})
		expect(result.token).toBe('SWIPE_RIGHT')
		expect(gestureIntent(result.token)).toBe('NEXT_MEDIA')
	})

	it('treats low-confidence gesture as UNKNOWN', () => {
		expect(
			normalizeGestureCandidate({
				token: 'THUMBS_UP',
				confidence: 0.4,
				threshold: 0.8,
				sourceRef: 'gesture-2',
				sessionRef: 'session-1',
			}).token,
		).toBe('UNKNOWN')
	})

	it('allows thumbs up to confirm only after a trusted DigitalMe session is known', () => {
		expect(isStepUpConfirmation('THUMBS_UP', true)).toBe(true)
		expect(isStepUpConfirmation('THUMBS_UP', false)).toBe(false)
	})

	it('returns only bounded token metadata and no frame payload', () => {
		const result = normalizeGestureCandidate({
			token: 'PALM_STOP',
			confidence: 1,
			threshold: 0.8,
			sourceRef: 'gesture-3',
			sessionRef: 'session-1',
		})
		expect(Object.keys(result).sort()).toEqual([
			'confidence',
			'sessionRef',
			'sourceRef',
			'token',
		])
	})
})
