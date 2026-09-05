import { validateCapabilityLicence, type CapabilityLicence } from '../licence'
import type { CapabilityLicenseRegistry } from '../registry'

const testRegistry = (): CapabilityLicenseRegistry => ({
	capabilities: [
		{
			capabilityId: 'SAFE_MEDIA',
			version: '1',
			domain: 'mobility',
			description: 'media',
			requiredExternalEntitlementIds: [],
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
			requiredExternalEntitlementIds: [],
			contextConstraints: [],
		},
	],
	effectiveFrom: '2026-09-05T00:00:00.000Z',
	expiresAt: '2026-09-06T00:00:00.000Z',
	status: 'ACTIVE',
	genesisRecordRef: 'GEN-1',
	issuedByRef: 'ISSUER-1',
	issuedAt: '2026-09-05T00:00:00.000Z',
	wardenPolicyVersion: 'W1',
	riverEvidenceRef: 'R1',
})

describe('capability licence validation', () => {
	it('rejects duplicate grant IDs', () => {
		const value = licence()
		value.grants.push({ ...value.grants[0] })
		expect(validateCapabilityLicence(value, testRegistry())).toContain('DUPLICATE_GRANT_ID:G1')
	})

	it('rejects allow/prohibit contradictions', () => {
		const value = licence()
		value.grants[0].prohibitedEffectIds = ['E1']
		expect(validateCapabilityLicence(value, testRegistry())).toContain('CONTRADICTORY_EFFECT:G1:E1')
	})

	it('rejects expired-before-effective licences', () => {
		const value = licence()
		value.expiresAt = value.effectiveFrom
		expect(validateCapabilityLicence(value, testRegistry())).toContain('INVALID_LICENCE_TIME_RANGE')
	})

	it('rejects globally non-licensable effects in a grant', () => {
		const value = licence()
		value.grants[0].allowedEffectIds = ['VEHICLE_STEER']
		expect(validateCapabilityLicence(value, testRegistry())).toContain('NON_LICENSABLE_EFFECT:G1:VEHICLE_STEER')
	})

	it('rejects a grant that broadens the capability data envelope', () => {
		const value = licence()
		value.grants[0].allowedDataClassIds = ['D1', 'D2']
		expect(validateCapabilityLicence(value, testRegistry())).toContain('GRANT_BROADENS_CAPABILITY_DATA:G1:D2')
	})

	it('rejects a purpose outside the capability envelope', () => {
		const value = licence()
		value.grants[0].purposeIds = ['P1', 'P2']
		expect(validateCapabilityLicence(value, testRegistry())).toContain('GRANT_BROADENS_CAPABILITY_PURPOSE:G1:P2')
	})

	it('rejects a capability version mismatch', () => {
		const value = licence()
		value.grants[0].capabilityVersion = '2'
		expect(validateCapabilityLicence(value, testRegistry())).toContain('CAPABILITY_VERSION_MISMATCH:G1:SAFE_MEDIA:2')
	})

	it('rejects invalid bounded context constraints at compile time', () => {
		const value = licence()
		value.grants[0].contextConstraints = [
			{ key: 'mode', operator: 'IN', value: 'PARKED', required: true },
		]
		expect(validateCapabilityLicence(value, testRegistry())).toContain(
			'INVALID_CONTEXT_CONSTRAINT:G1:IN_REQUIRES_STRING_ARRAY',
		)
	})
})
