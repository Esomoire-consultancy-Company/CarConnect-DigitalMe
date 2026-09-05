import {
	evaluateCapabilityLicence,
	type CapabilityLicenceEvaluationInput,
} from '../evaluator'
import type { CapabilityLicenseRegistry } from '../registry'
import type { CapabilityLicence } from '../licence'
import type { ExternalEntitlementAssertion } from '../entitlement'

const registry = (): CapabilityLicenseRegistry => ({
	capabilities: [
		{
			capabilityId: 'SAFE_MEDIA',
			version: '1',
			domain: 'mobility',
			description: 'media',
			requiredExternalEntitlementIds: ['OEM1'],
			allowedPurposeIds: ['P1'],
			allowedInputDataClassIds: ['D1'],
			allowedEffectIds: ['E1'],
			prohibitedEffectIds: [],
			licensable: true,
		},
	],
	purposes: [
		{
			purposeId: 'P1',
			version: '1',
			domain: 'mobility',
			description: 'purpose',
			compatibleCapabilityIds: ['SAFE_MEDIA'],
		},
	],
	dataClasses: [
		{
			dataClassId: 'D1',
			version: '1',
			sensitivity: 'PERSONAL',
			retentionDefault: 'TRANSIENT',
			rawMedia: false,
			biometric: false,
			secret: false,
		},
	],
	effects: [
		{
			effectId: 'E1',
			version: '1',
			domain: 'mobility',
			description: 'pause',
			safetyClass: 'NON_SAFETY',
			licensable: true,
			requiresEffectVerification: true,
		},
		{
			effectId: 'VEHICLE_STEER',
			version: '1',
			domain: 'mobility',
			description: 'steer',
			safetyClass: 'SAFETY_CRITICAL',
			licensable: false,
			requiresEffectVerification: true,
		},
	],
})

const licence = (): CapabilityLicence => ({
	licenceId: 'L1',
	licenceVersion: '1',
	schemaVersion: 'R0.1',
	holder: { principalType: 'DigitalMe', principalRef: 'DM1' },
	relationship: { relationshipType: 'vehicle', relationshipRef: 'VR1' },
	grants: [
		{
			grantId: 'G1',
			capabilityId: 'SAFE_MEDIA',
			capabilityVersion: '1',
			purposeIds: ['P1'],
			allowedDataClassIds: ['D1'],
			prohibitedDataClassIds: [],
			allowedEffectIds: ['E1'],
			prohibitedEffectIds: [],
			requiredExternalEntitlementIds: ['OEM1'],
			contextConstraints: [{ key: 'mode', operator: 'EQ', value: 'PARKED', required: true }],
		},
	],
	effectiveFrom: '2026-09-05T00:00:00Z',
	expiresAt: '2026-09-06T00:00:00Z',
	status: 'ACTIVE',
	genesisRecordRef: 'GEN1',
	issuedByRef: 'I1',
	issuedAt: '2026-09-05T00:00:00Z',
	wardenPolicyVersion: 'W1',
	riverEvidenceRef: 'R1',
})

const entitlement = (): ExternalEntitlementAssertion => ({
	entitlementId: 'OEM1',
	provider: 'oem',
	subjectRef: 'DM1',
	capabilityId: 'SAFE_MEDIA',
	status: 'VALID',
	observedAt: '2026-09-05T00:00:00Z',
	evidenceRef: 'RE1',
})

const validFixture = (): CapabilityLicenceEvaluationInput => ({
	registry: registry(),
	licence: licence(),
	entitlements: [entitlement()],
	request: {
		requestId: 'Q1',
		digitalMeSessionRef: 'S1',
		principalRef: 'DM1',
		relationshipRef: 'VR1',
		licenceRef: 'L1',
		capabilityId: 'SAFE_MEDIA',
		purposeId: 'P1',
		requestedEffectId: 'E1',
		inputDataClassIds: ['D1'],
		externalEntitlementRefs: ['OEM1'],
		context: { mode: 'PARKED' },
		requestedAt: '2026-09-05T12:00:00Z',
	},
})

describe('deterministic capability licence evaluator', () => {
	it('returns MATCH with stable matched grant ID when every licence gate passes', () => {
		expect(evaluateCapabilityLicence(validFixture())).toMatchObject({
			decision: 'MATCH',
			reasonCodes: [],
			matchedGrantRef: 'G1',
		})
	})

	it('denies principal mismatch before any runtime Warden decision exists', () => {
		const f = validFixture()
		f.request.principalRef = 'OTHER'
		expect(evaluateCapabilityLicence(f).reasonCodes).toEqual(['PRINCIPAL_MISMATCH'])
	})

	it('denies relationship mismatch', () => {
		const f = validFixture()
		f.request.relationshipRef = 'OTHER'
		expect(evaluateCapabilityLicence(f).reasonCodes).toEqual(['RELATIONSHIP_MISMATCH'])
	})

	it('denies a globally non-licensable requested effect even if a malformed licence says allow', () => {
		const f = validFixture()
		f.request.requestedEffectId = 'VEHICLE_STEER'
		f.licence.grants[0].allowedEffectIds.push('VEHICLE_STEER')
		expect(evaluateCapabilityLicence(f).reasonCodes).toContain('EFFECT_NOT_LICENSABLE')
	})

	it('fails closed for UNKNOWN external entitlement', () => {
		const f = validFixture()
		f.entitlements[0].status = 'UNKNOWN'
		expect(evaluateCapabilityLicence(f).reasonCodes).toEqual(['EXTERNAL_ENTITLEMENT_UNKNOWN'])
	})

	it('fails closed for missing required context', () => {
		const f = validFixture()
		f.request.context = {}
		expect(evaluateCapabilityLicence(f).reasonCodes).toEqual(['CONTEXT_REQUIRED_MISSING'])
	})

	it('denies revoked licence', () => {
		const f = validFixture()
		f.licence.status = 'REVOKED'
		expect(evaluateCapabilityLicence(f).reasonCodes).toEqual(['LICENCE_REVOKED'])
	})
})
