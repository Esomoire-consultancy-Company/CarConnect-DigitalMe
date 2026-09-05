export type CapabilityDefinition = {
	capabilityId: string
	version: string
	domain: string
	description: string
	requiredExternalEntitlementIds: string[]
	allowedPurposeIds: string[]
	allowedInputDataClassIds: string[]
	allowedEffectIds: string[]
	prohibitedEffectIds: string[]
	licensable: boolean
}

export type PurposeDefinition = {
	purposeId: string
	version: string
	domain: string
	description: string
	compatibleCapabilityIds: string[]
	retentionClass?: string
}

export type DataClassDefinition = {
	dataClassId: string
	version: string
	sensitivity: 'PUBLIC' | 'INTERNAL' | 'PERSONAL' | 'SENSITIVE' | 'RESTRICTED'
	retentionDefault: 'NONE' | 'TRANSIENT' | 'SESSION' | 'EVIDENCE_BOUNDED'
	rawMedia: boolean
	biometric: boolean
	secret: boolean
}

export type EffectDefinition = {
	effectId: string
	version: string
	domain: string
	description: string
	safetyClass: 'NON_SAFETY' | 'SAFETY_RELATED' | 'SAFETY_CRITICAL'
	licensable: boolean
	requiresEffectVerification: boolean
}

export type CapabilityLicenseRegistry = {
	capabilities: CapabilityDefinition[]
	purposes: PurposeDefinition[]
	dataClasses: DataClassDefinition[]
	effects: EffectDefinition[]
}

export function validateRegistry(registry: CapabilityLicenseRegistry): string[] {
	const errors: string[] = []
	const purposes = new Set(registry.purposes.map((x) => x.purposeId))
	const data = new Set(registry.dataClasses.map((x) => x.dataClassId))
	const effects = new Map(registry.effects.map((x) => [x.effectId, x]))

	for (const capability of registry.capabilities) {
		for (const purposeId of capability.allowedPurposeIds) {
			if (!purposes.has(purposeId)) {
				errors.push(`UNKNOWN_PURPOSE:${capability.capabilityId}:${purposeId}`)
			}
		}
		for (const dataClassId of capability.allowedInputDataClassIds) {
			if (!data.has(dataClassId)) {
				errors.push(`UNKNOWN_DATA_CLASS:${capability.capabilityId}:${dataClassId}`)
			}
		}
		for (const effectId of capability.allowedEffectIds) {
			const effect = effects.get(effectId)
			if (!effect) {
				errors.push(`UNKNOWN_EFFECT:${capability.capabilityId}:${effectId}`)
			} else if (!effect.licensable) {
				errors.push(
					`CAPABILITY_ALLOWS_NON_LICENSABLE_EFFECT:${capability.capabilityId}:${effectId}`,
				)
			}
		}
	}

	return errors
}
