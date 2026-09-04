import { createMobilityEvidenceEvent } from '../mobility/evidence'

describe('Warden mobility River evidence', () => {
	it('creates an ordered normalized event', () => {
		expect(
			createMobilityEvidenceEvent({
				eventId: 'm-1',
				sessionRef: 's-1',
				type: 'MOBILITY_CONTEXT_OBSERVED',
				at: '2026-09-04T12:00:00.000Z',
				payload: { trafficState: 'DENSE' },
			}),
		).toMatchObject({
			eventId: 'm-1',
			sessionRef: 's-1',
			type: 'MOBILITY_CONTEXT_OBSERVED',
		})
	})

	it('allows normalized semantic gesture and voice tokens', () => {
		expect(() =>
			createMobilityEvidenceEvent({
				eventId: 'm-semantic',
				sessionRef: 's-1',
				type: 'GESTURE_TOKEN_RECOGNIZED',
				at: '2026-09-04T12:00:00.000Z',
				payload: {
					gestureToken: 'THUMBS_UP',
					voiceIntentToken: 'PAUSE_MEDIA',
				},
			}),
		).not.toThrow()
	})

	it.each([
		'rawFrame',
		'audioRecording',
		'voiceprint',
		'biometricTemplate',
		'providerSecret',
		'password',
		'credential',
		'accessToken',
		'providerToken',
		'refreshToken',
	])('rejects privacy-sensitive evidence key %s', (key) => {
		expect(() =>
			createMobilityEvidenceEvent({
				eventId: 'm-2',
				sessionRef: 's-1',
				type: 'GESTURE_TOKEN_RECOGNIZED',
				at: '2026-09-04T12:00:00.000Z',
				payload: { [key]: 'forbidden' },
			}),
		).toThrow()
	})
})
