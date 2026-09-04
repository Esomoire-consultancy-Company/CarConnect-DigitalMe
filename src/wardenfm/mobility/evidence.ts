export type MobilityRiverEventType =
	| 'MOBILITY_CONTEXT_OBSERVED'
	| 'VOICE_INTENT_RECOGNIZED'
	| 'GESTURE_TOKEN_RECOGNIZED'
	| 'STEP_UP_CONFIRMATION_REQUESTED'
	| 'STEP_UP_CONFIRMATION_DECIDED'
	| 'CONTEXT_MEDIA_PROFILE_RECOMMENDED'
	| 'CONTEXT_MEDIA_PROFILE_ADMITTED'
	| 'DIGITAL_MIRROR_MOBILITY_STATE_CHANGED'
	| 'MOBILITY_CAPABILITY_GRANTED'
	| 'MOBILITY_CAPABILITY_REVOKED'
	| 'MOBILITY_EFFECT_VERIFIED'

export type MobilityRiverEvent = {
	eventId: string
	sessionRef: string
	type: MobilityRiverEventType
	at: string
	payload: Record<string, unknown>
	wardenDecisionRef?: string
	priorEventRef?: string
}

export type MobilityEvidenceSpineDependencies = {
	idFactory?: () => string
	now?: () => string
}

const FORBIDDEN_KEY =
	/(rawframe|audiorecording|voiceprint|biometrictemplate|providersecret|password|credential|accesstoken|providertoken|refreshtoken)/i

function assertSafe(value: unknown, path = 'payload'): void {
	if (!value || typeof value !== 'object') return

	for (const [key, child] of Object.entries(
		value as Record<string, unknown>,
	)) {
		if (FORBIDDEN_KEY.test(key)) {
			throw new Error(`Forbidden mobility evidence field: ${path}.${key}`)
		}
		assertSafe(child, `${path}.${key}`)
	}
}

export function createMobilityEvidenceEvent(
	event: MobilityRiverEvent,
): MobilityRiverEvent {
	assertSafe(event.payload)
	return { ...event, payload: { ...event.payload } }
}

export class MobilityEvidenceSpine {
	private readonly records: MobilityRiverEvent[] = []
	private readonly lastEventBySession = new Map<string, string>()
	private readonly idFactory: () => string
	private readonly now: () => string

	public constructor(dependencies: MobilityEvidenceSpineDependencies = {}) {
		this.idFactory =
			dependencies.idFactory ?? (() => `${Date.now()}-${this.records.length + 1}`)
		this.now = dependencies.now ?? (() => new Date().toISOString())
	}

	public get events(): MobilityRiverEvent[] {
		return this.records.map((event) => ({
			...event,
			payload: { ...event.payload },
		}))
	}

	public append(
		sessionRef: string,
		type: MobilityRiverEventType,
		payload: Record<string, unknown>,
		wardenDecisionRef?: string,
	): MobilityRiverEvent {
		const event = createMobilityEvidenceEvent({
			eventId: this.idFactory(),
			sessionRef,
			type,
			at: this.now(),
			payload,
			wardenDecisionRef,
			priorEventRef: this.lastEventBySession.get(sessionRef),
		})

		this.records.push(event)
		this.lastEventBySession.set(sessionRef, event.eventId)
		return { ...event, payload: { ...event.payload } }
	}
}
