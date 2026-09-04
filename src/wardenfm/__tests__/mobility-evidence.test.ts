import {
	MobilityEvidenceSpine,
	createMobilityEvidenceEvent,
} from '../mobility/evidence'

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

	it('maintains an append-only prior-event chain', () => {
		let id = 0
		const spine = new MobilityEvidenceSpine({
			idFactory: () => `m-${++id}`,
			now: () => '2026-09-04T12:00:00.000Z',
		})

		spine.append('s-1', 'MOBILITY_CONTEXT_OBSERVED', {
			trafficState: 'DENSE',
		})
		const firstSnapshot = spine.events
		spine.append('s-1', 'CONTEXT_MEDIA_PROFILE_RECOMMENDED', {
			profile: 'FOCUS_LOW_COMPLEXITY',
		})

		expect(spine.events[0]).toEqual(firstSnapshot[0])
		expect(spine.events[1].priorEventRef).toBe('m-1')
		expect(spine.events.map((event) => event.eventId)).toEqual(['m-1', 'm-2'])
	})

	it('does not expose mutable evidence backing storage', () => {
		const spine = new MobilityEvidenceSpine({
			idFactory: () => 'm-1',
			now: () => '2026-09-04T12:00:00.000Z',
		})
		spine.append('s-1', 'MOBILITY_CONTEXT_OBSERVED', {})
		const snapshot = spine.events
		;(snapshot as unknown as unknown[]).length = 0
		expect(spine.events).toHaveLength(1)
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
