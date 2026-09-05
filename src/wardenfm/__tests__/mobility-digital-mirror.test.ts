import { DigitalMirrorMobilityState } from '../mobility/digital-mirror'
import { MobilityEvidenceSpine } from '../mobility/evidence'

describe('Digital Mirror mobility state', () => {
	const grant = {
		grantId: 'grant-1',
		digitalMeId: 'dm-1',
		vehicleRelationshipRef: 'veh-rel-1',
		capability: 'context-media-routing',
		purpose: 'driver-media-personalization',
		effectiveFrom: '2026-09-04T12:00:00.000Z',
		expiresAt: '2026-09-04T13:00:00.000Z',
		wardenDecisionRef: 'warden-1',
		riverEvidenceRef: 'river-1',
	}

	const makeEvidence = () => {
		let id = 0
		return new MobilityEvidenceSpine({
			idFactory: () => `m-${++id}`,
			now: () => '2026-09-04T12:00:00.000Z',
		})
	}

	it('authorizes only an active matching grant', () => {
		const state = new DigitalMirrorMobilityState()
		state.grant(grant)
		expect(
			state.hasCapability(
				'context-media-routing',
				'2026-09-04T12:30:00.000Z',
			),
		).toBe(true)
		expect(
			state.hasCapability(
				'context-media-routing',
				'2026-09-04T14:00:00.000Z',
			),
		).toBe(false)
	})

	it('revocation removes capability immediately', () => {
		const state = new DigitalMirrorMobilityState()
		state.grant(grant)
		state.revoke('grant-1')
		expect(
			state.hasCapability(
				'context-media-routing',
				'2026-09-04T12:30:00.000Z',
			),
		).toBe(false)
	})

	it('progress state alone never authorizes a capability', () => {
		const state = new DigitalMirrorMobilityState()
		state.progressTo('ROUTINE_ESTABLISHED')
		expect(
			state.hasCapability(
				'context-media-routing',
				'2026-09-04T12:30:00.000Z',
			),
		).toBe(false)
	})

	it('emits ordered River evidence for progress, grant, and revocation', () => {
		const evidence = makeEvidence()
		const state = new DigitalMirrorMobilityState({
			evidence,
			sessionRef: 'dm-session-1',
		})

		state.progressTo('CONTEXT_KNOWN')
		state.grant(grant)
		state.revoke('grant-1')

		expect(evidence.events.map((event) => event.type)).toEqual([
			'DIGITAL_MIRROR_MOBILITY_STATE_CHANGED',
			'MOBILITY_CAPABILITY_GRANTED',
			'MOBILITY_CAPABILITY_REVOKED',
		])
		expect(evidence.events[1]).toMatchObject({
			wardenDecisionRef: 'warden-1',
			payload: {
				grantId: 'grant-1',
				capability: 'context-media-routing',
				purpose: 'driver-media-personalization',
			},
		})
		expect(evidence.events[2].priorEventRef).toBe('m-2')
	})
})
