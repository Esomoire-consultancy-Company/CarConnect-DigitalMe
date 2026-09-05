import {
	requestWardenDecision,
	type WardenCapabilityAdmissionPort,
} from '../warden'
import type {
	CapabilityAdmissionRequest,
	LicenceEvaluationResult,
} from '../evaluator'

const request = (): CapabilityAdmissionRequest => ({
	requestId: 'Q1',
	digitalMeSessionRef: 'S1',
	principalRef: 'DM1',
	relationshipRef: 'VR1',
	licenceRef: 'L1',
	capabilityId: 'C1',
	purposeId: 'P1',
	requestedEffectId: 'E1',
	inputDataClassIds: [],
	externalEntitlementRefs: [],
	context: {},
	requestedAt: '2026-09-05T12:00:00Z',
})

const match = (): LicenceEvaluationResult => ({
	decision: 'MATCH',
	reasonCodes: [],
	matchedGrantRef: 'G1',
	licenceRef: 'L1',
	licenceVersion: '1',
	evaluatedAt: '2026-09-05T12:00:00Z',
})

const deny = (): LicenceEvaluationResult => ({
	decision: 'DENY',
	reasonCodes: ['CAPABILITY_NOT_LICENSED'],
	licenceRef: 'L1',
	licenceVersion: '1',
	evaluatedAt: '2026-09-05T12:00:00Z',
})

describe('external Warden admission boundary', () => {
	it('does not call Warden when licence evaluation is DENY', async () => {
		let called = false
		const port: WardenCapabilityAdmissionPort = {
			decide: async () => {
				called = true
				throw new Error('must not call')
			},
		}
		expect(await requestWardenDecision(deny(), request(), port)).toBeUndefined()
		expect(called).toBe(false)
	})

	it('requires external Warden ALLOW after licence MATCH', async () => {
		const port: WardenCapabilityAdmissionPort = {
			decide: async () => ({
				decision: 'ALLOW',
				reasonCodes: [],
				licenceEvaluationRef: 'LE1',
				wardenDecisionRef: 'WD1',
				policyVersion: 'W1',
				evaluatedAt: '2026-09-05T12:00:00Z',
			}),
		}
		expect((await requestWardenDecision(match(), request(), port))?.decision).toBe('ALLOW')
	})

	it('preserves external Warden DENY after licence MATCH', async () => {
		const port: WardenCapabilityAdmissionPort = {
			decide: async () => ({
				decision: 'DENY',
				reasonCodes: ['WARDEN_DENIED'],
				licenceEvaluationRef: 'LE2',
				wardenDecisionRef: 'WD2',
				policyVersion: 'W1',
				evaluatedAt: '2026-09-05T12:00:00Z',
			}),
		}
		expect((await requestWardenDecision(match(), request(), port))?.decision).toBe('DENY')
	})
})
