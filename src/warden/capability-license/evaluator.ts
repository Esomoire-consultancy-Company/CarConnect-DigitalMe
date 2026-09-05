import type { CapabilityLicenseRegistry } from './registry'
import type { CapabilityLicence } from './licence'
import { evaluateContextConstraints } from './constraints'
import {
	evaluateRequiredEntitlements,
	type ExternalEntitlementAssertion,
} from './entitlement'

export type CapabilityAdmissionRequest = {
	requestId: string
	digitalMeSessionRef: string
	principalRef: string
	relationshipRef: string
	licenceRef: string
	capabilityId: string
	purposeId: string
	requestedEffectId: string
	inputDataClassIds: string[]
	externalEntitlementRefs: string[]
	context: Record<string, string | number | boolean | string[]>
	confirmationRef?: string
	requestedAt: string
}

export type LicenceReasonCode =
	| 'PRINCIPAL_MISMATCH'
	| 'RELATIONSHIP_MISMATCH'
	| 'LICENCE_NOT_ACTIVE'
	| 'LICENCE_NOT_EFFECTIVE'
	| 'LICENCE_EXPIRED'
	| 'LICENCE_REVOKED'
	| 'CAPABILITY_NOT_LICENSED'
	| 'CAPABILITY_NOT_LICENSABLE'
	| 'PURPOSE_NOT_ALLOWED'
	| 'DATA_CLASS_NOT_ALLOWED'
	| 'DATA_CLASS_PROHIBITED'
	| 'EFFECT_NOT_ALLOWED'
	| 'EFFECT_PROHIBITED'
	| 'EFFECT_NOT_LICENSABLE'
	| 'EXTERNAL_ENTITLEMENT_MISSING'
	| 'EXTERNAL_ENTITLEMENT_INVALID'
	| 'EXTERNAL_ENTITLEMENT_UNKNOWN'
	| 'EXTERNAL_ENTITLEMENT_EXPIRED'
	| 'CONTEXT_REQUIRED_MISSING'
	| 'CONTEXT_CONSTRAINT_FAILED'
	| 'CONFIRMATION_REQUIRED'
	| 'CONFIRMATION_INVALID'

export type LicenceEvaluationResult = {
	decision: 'MATCH' | 'DENY'
	reasonCodes: LicenceReasonCode[]
	matchedGrantRef?: string
	licenceRef: string
	licenceVersion: string
	evaluatedAt: string
}

export type CapabilityLicenceEvaluationInput = {
	registry: CapabilityLicenseRegistry
	licence: CapabilityLicence
	request: CapabilityAdmissionRequest
	entitlements: ExternalEntitlementAssertion[]
}

function deny(
	input: CapabilityLicenceEvaluationInput,
	reason: LicenceReasonCode,
): LicenceEvaluationResult {
	return {
		decision: 'DENY',
		reasonCodes: [reason],
		licenceRef: input.licence.licenceId,
		licenceVersion: input.licence.licenceVersion,
		evaluatedAt: input.request.requestedAt,
	}
}

export function evaluateCapabilityLicence(
	input: CapabilityLicenceEvaluationInput,
): LicenceEvaluationResult {
	const { registry, licence, request } = input

	if (request.principalRef !== licence.holder.principalRef) {
		return deny(input, 'PRINCIPAL_MISMATCH')
	}
	if (request.relationshipRef !== licence.relationship.relationshipRef) {
		return deny(input, 'RELATIONSHIP_MISMATCH')
	}
	if (request.licenceRef !== licence.licenceId) {
		return deny(input, 'CAPABILITY_NOT_LICENSED')
	}

	if (licence.status === 'REVOKED') return deny(input, 'LICENCE_REVOKED')
	if (licence.status === 'EXPIRED') return deny(input, 'LICENCE_EXPIRED')
	if (licence.status !== 'ACTIVE') return deny(input, 'LICENCE_NOT_ACTIVE')
	if (Date.parse(request.requestedAt) < Date.parse(licence.effectiveFrom)) {
		return deny(input, 'LICENCE_NOT_EFFECTIVE')
	}
	if (Date.parse(request.requestedAt) >= Date.parse(licence.expiresAt)) {
		return deny(input, 'LICENCE_EXPIRED')
	}

	const capability = registry.capabilities.find((x) => x.capabilityId === request.capabilityId)
	if (!capability) return deny(input, 'CAPABILITY_NOT_LICENSED')
	if (!capability.licensable) return deny(input, 'CAPABILITY_NOT_LICENSABLE')

	const grant = licence.grants.find(
		(x) => x.capabilityId === request.capabilityId && x.capabilityVersion === capability.version,
	)
	if (!grant) return deny(input, 'CAPABILITY_NOT_LICENSED')

	if (
		!capability.allowedPurposeIds.includes(request.purposeId) ||
		!grant.purposeIds.includes(request.purposeId)
	) {
		return deny(input, 'PURPOSE_NOT_ALLOWED')
	}

	for (const dataClassId of request.inputDataClassIds) {
		if (grant.prohibitedDataClassIds.includes(dataClassId)) {
			return deny(input, 'DATA_CLASS_PROHIBITED')
		}
		if (
			!capability.allowedInputDataClassIds.includes(dataClassId) ||
			!grant.allowedDataClassIds.includes(dataClassId)
		) {
			return deny(input, 'DATA_CLASS_NOT_ALLOWED')
		}
	}

	const effect = registry.effects.find((x) => x.effectId === request.requestedEffectId)
	if (!effect) return deny(input, 'EFFECT_NOT_ALLOWED')
	if (!effect.licensable) return deny(input, 'EFFECT_NOT_LICENSABLE')
	if (
		capability.prohibitedEffectIds.includes(request.requestedEffectId) ||
		grant.prohibitedEffectIds.includes(request.requestedEffectId)
	) {
		return deny(input, 'EFFECT_PROHIBITED')
	}
	if (
		!capability.allowedEffectIds.includes(request.requestedEffectId) ||
		!grant.allowedEffectIds.includes(request.requestedEffectId)
	) {
		return deny(input, 'EFFECT_NOT_ALLOWED')
	}

	const requiredEntitlementIds = [
		...new Set([
			...capability.requiredExternalEntitlementIds,
			...grant.requiredExternalEntitlementIds,
		]),
	]
	const referencedAssertions = input.entitlements.filter((x) =>
		request.externalEntitlementRefs.includes(x.entitlementId),
	)
	for (const entitlementId of requiredEntitlementIds) {
		const assertion = referencedAssertions.find((x) => x.entitlementId === entitlementId)
		if (
			assertion &&
			(assertion.subjectRef !== request.principalRef || assertion.capabilityId !== request.capabilityId)
		) {
			return deny(input, 'EXTERNAL_ENTITLEMENT_INVALID')
		}
	}
	const entitlement = evaluateRequiredEntitlements(
		requiredEntitlementIds,
		referencedAssertions,
		request.requestedAt,
	)
	if (!entitlement.matched && entitlement.reason) {
		return deny(input, entitlement.reason)
	}

	const context = evaluateContextConstraints(grant.contextConstraints, request.context)
	if (!context.matched && context.reason) {
		return deny(input, context.reason)
	}

	if (grant.confirmationPolicy?.required && !request.confirmationRef) {
		return deny(input, 'CONFIRMATION_REQUIRED')
	}

	return {
		decision: 'MATCH',
		reasonCodes: [],
		matchedGrantRef: grant.grantId,
		licenceRef: licence.licenceId,
		licenceVersion: licence.licenceVersion,
		evaluatedAt: request.requestedAt,
	}
}
