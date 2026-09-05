import type { CapabilityLicence } from './licence'
import type { CapabilityLicenseRegistry } from './registry'
import type { ExternalEntitlementAssertion } from './entitlement'

export type DigitalMeCapabilityCardState =
	| 'LICENSED_ENVELOPE'
	| 'LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED'
	| 'AVAILABLE_WARDEN_ADMISSION_REQUIRED'
	| 'SUSPENDED'
	| 'REVOKED'
	| 'EXPIRED'
	| 'NOT_LICENSED'
	| 'NON_LICENSABLE'

export type DigitalMeCapabilityCardProjection = {
	licenceRef: string
	licenceVersion: string
	principalRef: string
	relationshipRef: string
	capabilities: Array<{
		grantId: string
		capabilityId: string
		capabilityVersion: string
		state: DigitalMeCapabilityCardState
		purposeIds: string[]
		allowedDataClassIds: string[]
		prohibitedDataClassIds: string[]
		allowedEffectIds: string[]
		prohibitedEffectIds: string[]
		requiredExternalEntitlementIds: string[]
		wardenAdmissionRequired: true
	}>
}

function lifecycleState(
	licence: CapabilityLicence,
	at: string,
): DigitalMeCapabilityCardState | undefined {
	if (licence.status === 'REVOKED') return 'REVOKED'
	if (licence.status === 'SUSPENDED') return 'SUSPENDED'
	if (licence.status === 'EXPIRED' || Date.parse(at) >= Date.parse(licence.expiresAt)) {
		return 'EXPIRED'
	}
	return undefined
}

export function projectDigitalMeCapabilityCard(
	licence: CapabilityLicence,
	registry: CapabilityLicenseRegistry,
	entitlements: ExternalEntitlementAssertion[],
	at: string,
): DigitalMeCapabilityCardProjection {
	const lifecycle = lifecycleState(licence, at)
	return {
		licenceRef: licence.licenceId,
		licenceVersion: licence.licenceVersion,
		principalRef: licence.holder.principalRef,
		relationshipRef: licence.relationship.relationshipRef,
		capabilities: licence.grants.map((grant) => {
			const capability = registry.capabilities.find(
				(x) => x.capabilityId === grant.capabilityId,
			)
			let state: DigitalMeCapabilityCardState
			if (lifecycle) {
				state = lifecycle
			} else if (!capability) {
				state = 'NOT_LICENSED'
			} else if (!capability.licensable) {
				state = 'NON_LICENSABLE'
			} else {
				const required = [
					...new Set([
						...capability.requiredExternalEntitlementIds,
						...grant.requiredExternalEntitlementIds,
					]),
				]
				const unresolved = required.some((id) => {
					const assertion = entitlements.find((x) => x.entitlementId === id)
					return (
						!assertion ||
						assertion.status !== 'VALID' ||
						(!!assertion.expiresAt && Date.parse(assertion.expiresAt) <= Date.parse(at))
					)
				})
				state = unresolved
					? 'LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED'
					: 'AVAILABLE_WARDEN_ADMISSION_REQUIRED'
			}

			return {
				grantId: grant.grantId,
				capabilityId: grant.capabilityId,
				capabilityVersion: grant.capabilityVersion,
				state,
				purposeIds: [...grant.purposeIds],
				allowedDataClassIds: [...grant.allowedDataClassIds],
				prohibitedDataClassIds: [...grant.prohibitedDataClassIds],
				allowedEffectIds: [...grant.allowedEffectIds],
				prohibitedEffectIds: [...grant.prohibitedEffectIds],
				requiredExternalEntitlementIds: [...grant.requiredExternalEntitlementIds],
				wardenAdmissionRequired: true as const,
			}
		}),
	}
}
