import type { CapabilityLicenseRegistry } from './registry'
import { validateContextConstraint } from './constraints'

export type ContextConstraint = {
	key: string
	operator: 'EQ' | 'NEQ' | 'IN' | 'NOT_IN' | 'GTE' | 'LTE' | 'EXISTS'
	value?: string | number | boolean | string[]
	required: boolean
}

export type CapabilityLicenceGrant = {
	grantId: string
	capabilityId: string
	capabilityVersion: string
	purposeIds: string[]
	allowedDataClassIds: string[]
	prohibitedDataClassIds: string[]
	allowedEffectIds: string[]
	prohibitedEffectIds: string[]
	requiredExternalEntitlementIds: string[]
	contextConstraints: ContextConstraint[]
	confirmationPolicy?: {
		required: boolean
		admittedFactors: Array<'VOICE_CONFIRMATION' | 'GESTURE_CONFIRMATION' | 'TOUCH_CONFIRMATION'>
	}
}

export type CapabilityLicence = {
	licenceId: string
	licenceVersion: string
	schemaVersion: 'R0.1'
	holder: { principalType: 'DigitalMe'; principalRef: string }
	relationship: {
		relationshipType: string
		relationshipRef: string
		locationRef?: string
		deviceRef?: string
	}
	grants: CapabilityLicenceGrant[]
	effectiveFrom: string
	expiresAt: string
	status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'
	genesisRecordRef: string
	issuedByRef: string
	issuedAt: string
	wardenPolicyVersion: string
	riverEvidenceRef: string
	supersedesLicenceRef?: string
}

export function validateCapabilityLicence(
	value: CapabilityLicence,
	registry: CapabilityLicenseRegistry,
): string[] {
	const errors: string[] = []
	if (Date.parse(value.expiresAt) <= Date.parse(value.effectiveFrom)) {
		errors.push('INVALID_LICENCE_TIME_RANGE')
	}

	const seen = new Set<string>()
	const capabilities = new Map(registry.capabilities.map((x) => [x.capabilityId, x]))
	const effects = new Map(registry.effects.map((x) => [x.effectId, x]))

	for (const grant of value.grants) {
		if (seen.has(grant.grantId)) {
			errors.push(`DUPLICATE_GRANT_ID:${grant.grantId}`)
		}
		seen.add(grant.grantId)

		const capability = capabilities.get(grant.capabilityId)
		if (!capability || !capability.licensable) {
			errors.push(`NON_LICENSABLE_CAPABILITY:${grant.grantId}:${grant.capabilityId}`)
		}
		if (capability && grant.capabilityVersion !== capability.version) {
			errors.push(
				`CAPABILITY_VERSION_MISMATCH:${grant.grantId}:${grant.capabilityId}:${grant.capabilityVersion}`,
			)
		}
		for (const purposeId of grant.purposeIds) {
			if (capability && !capability.allowedPurposeIds.includes(purposeId)) {
				errors.push(`GRANT_BROADENS_CAPABILITY_PURPOSE:${grant.grantId}:${purposeId}`)
			}
		}
		for (const constraint of grant.contextConstraints) {
			for (const error of validateContextConstraint(constraint)) {
				errors.push(`INVALID_CONTEXT_CONSTRAINT:${grant.grantId}:${error}`)
			}
		}

		for (const effectId of grant.allowedEffectIds) {
			if (grant.prohibitedEffectIds.includes(effectId)) {
				errors.push(`CONTRADICTORY_EFFECT:${grant.grantId}:${effectId}`)
			}
			const effect = effects.get(effectId)
			if (!effect || !effect.licensable) {
				errors.push(`NON_LICENSABLE_EFFECT:${grant.grantId}:${effectId}`)
			}
			if (capability && !capability.allowedEffectIds.includes(effectId)) {
				errors.push(`GRANT_BROADENS_CAPABILITY_EFFECT:${grant.grantId}:${effectId}`)
			}
		}

		for (const dataClassId of grant.allowedDataClassIds) {
			if (grant.prohibitedDataClassIds.includes(dataClassId)) {
				errors.push(`CONTRADICTORY_DATA_CLASS:${grant.grantId}:${dataClassId}`)
			}
			if (capability && !capability.allowedInputDataClassIds.includes(dataClassId)) {
				errors.push(`GRANT_BROADENS_CAPABILITY_DATA:${grant.grantId}:${dataClassId}`)
			}
		}
	}

	return errors
}
