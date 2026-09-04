import { normalizeVoiceIntentCandidate } from '../mobility/voice-intent'

describe('Warden mobility voice intent', () => {
	it('accepts an allowlisted intent only above threshold', () => {
		expect(
			normalizeVoiceIntentCandidate({
				intent: 'PAUSE_MEDIA',
				confidence: 0.92,
				threshold: 0.8,
				sourceRef: 'voice-1',
				sessionRef: 'session-1',
			}).intent,
		).toBe('PAUSE_MEDIA')
	})

	it('returns NO_ACTION when confidence is below policy threshold', () => {
		expect(
			normalizeVoiceIntentCandidate({
				intent: 'PAUSE_MEDIA',
				confidence: 0.5,
				threshold: 0.8,
				sourceRef: 'voice-2',
				sessionRef: 'session-1',
			}).intent,
		).toBe('NO_ACTION')
	})

	it('returns NO_ACTION for unsupported provider output', () => {
		expect(
			normalizeVoiceIntentCandidate({
				intent: 'OPEN_SHELL',
				confidence: 1,
				threshold: 0.8,
				sourceRef: 'voice-3',
				sessionRef: 'session-1',
			}).intent,
		).toBe('NO_ACTION')
	})
})
