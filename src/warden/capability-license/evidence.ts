export type CapabilityLicenseRiverEventType =
	| 'CAPABILITY_LICENCE_ISSUED'
	| 'CAPABILITY_LICENCE_ACTIVATED'
	| 'CAPABILITY_LICENCE_SUSPENDED'
	| 'CAPABILITY_LICENCE_REVOKED'
	| 'CAPABILITY_LICENCE_EXPIRED'
	| 'CAPABILITY_ADMISSION_REQUESTED'
	| 'EXTERNAL_ENTITLEMENT_EVALUATED'
	| 'CAPABILITY_LICENCE_MATCH_EVALUATED'
	| 'WARDEN_CAPABILITY_DECISION_RECORDED'
	| 'CAPABILITY_DEED_EXECUTED'
	| 'CAPABILITY_EFFECT_VERIFIED'

export type CapabilityLicenseRiverEvent = Readonly<{
	eventRef: string
	sessionRef: string
	priorEventRef?: string
	eventType: CapabilityLicenseRiverEventType
	observedAt: string
	payload: Readonly<Record<string, unknown>>
}>

const forbiddenKeyFragments = [
	'providersecret',
	'accesstoken',
	'rawframe',
	'continuousrawaudio',
	'biometrictemplate',
	'password',
	'credential',
	'refreshtoken',
	'providertoken',
	'rawcabinvideo',
	'voiceprint',
]

function assertEvidenceSafe(value: unknown): void {
	if (Array.isArray(value)) {
		for (const item of value) assertEvidenceSafe(item)
		return
	}
	if (!value || typeof value !== 'object') return
	for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
		const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
		if (forbiddenKeyFragments.some((fragment) => normalized.includes(fragment))) {
			throw new Error(`FORBIDDEN_EVIDENCE_FIELD:${key}`)
		}
		assertEvidenceSafe(child)
	}
}

function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.freeze(value)
		for (const child of Object.values(value as Record<string, unknown>)) {
			deepFreeze(child)
		}
	}
	return value
}

export class CapabilityLicenseEvidenceSpine {
	private readonly store: CapabilityLicenseRiverEvent[] = []
	private readonly latestBySession = new Map<string, string>()
	private readonly deps: { idFactory: () => string; now: () => string }

	constructor(deps: { idFactory: () => string; now: () => string }) {
		this.deps = deps
	}

	append(
		sessionRef: string,
		eventType: CapabilityLicenseRiverEventType,
		payload: Record<string, unknown>,
	): CapabilityLicenseRiverEvent {
		assertEvidenceSafe(payload)
		const eventRef = this.deps.idFactory()
		const priorEventRef = this.latestBySession.get(sessionRef)
		const safePayload = deepFreeze(structuredClone(payload))
		const event = deepFreeze({
			eventRef,
			sessionRef,
			...(priorEventRef ? { priorEventRef } : {}),
			eventType,
			observedAt: this.deps.now(),
			payload: safePayload,
		}) as CapabilityLicenseRiverEvent
		this.store.push(event)
		this.latestBySession.set(sessionRef, eventRef)
		return event
	}

	get events(): readonly CapabilityLicenseRiverEvent[] {
		return Object.freeze([...this.store])
	}
}
