export type ExternalEntitlementAssertion = {
	entitlementId: string
	provider: string
	subjectRef: string
	capabilityId: string
	status: 'VALID' | 'INVALID' | 'UNKNOWN'
	observedAt: string
	expiresAt?: string
	evidenceRef: string
}

export type EntitlementReason =
	| 'EXTERNAL_ENTITLEMENT_MISSING'
	| 'EXTERNAL_ENTITLEMENT_INVALID'
	| 'EXTERNAL_ENTITLEMENT_UNKNOWN'
	| 'EXTERNAL_ENTITLEMENT_EXPIRED'

export function evaluateRequiredEntitlements(
	requiredIds: string[],
	assertions: ExternalEntitlementAssertion[],
	at: string,
): { matched: boolean; reason?: EntitlementReason } {
	for (const id of requiredIds) {
		const assertion = assertions.find((x) => x.entitlementId === id)
		if (!assertion) {
			return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_MISSING' }
		}
		if (assertion.status === 'UNKNOWN') {
			return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_UNKNOWN' }
		}
		if (assertion.status === 'INVALID') {
			return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_INVALID' }
		}
		if (assertion.expiresAt && Date.parse(assertion.expiresAt) <= Date.parse(at)) {
			return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_EXPIRED' }
		}
	}

	return { matched: true }
}
