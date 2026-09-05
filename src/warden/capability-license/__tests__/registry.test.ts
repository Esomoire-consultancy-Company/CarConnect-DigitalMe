import { validateRegistry, type CapabilityLicenseRegistry } from '../registry'

const registry = (): CapabilityLicenseRegistry => ({
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

describe('capability license registry', () => {
	it('accepts a coherent registry', () => {
		expect(validateRegistry(registry())).toEqual([])
	})

	it('rejects a capability that structurally allows a non-licensable effect', () => {
		const input = registry()
		input.capabilities[0].allowedEffectIds.push('VEHICLE_STEER')
		expect(validateRegistry(input)).toContain(
			'CAPABILITY_ALLOWS_NON_LICENSABLE_EFFECT:SAFE_MEDIA:VEHICLE_STEER',
		)
	})

	it('rejects unresolved references', () => {
		const input = registry()
		input.capabilities[0].allowedPurposeIds = ['MISSING']
		expect(validateRegistry(input)).toContain('UNKNOWN_PURPOSE:SAFE_MEDIA:MISSING')
	})
})
