import { MobilityEvidenceSpine } from './evidence'

export type MobilityProgressState =
	| 'SESSION_BOUND'
	| 'CONTEXT_KNOWN'
	| 'WARDEN_ADMITTED'
	| 'VOICE_AVAILABLE'
	| 'GESTURE_AVAILABLE'
	| 'MEDIA_PROFILE_ACTIVE'
	| 'ROUTINE_ESTABLISHED'

export type MobilityCapabilityGrant = {
	grantId: string
	digitalMeId: string
	vehicleRelationshipRef: string
	capability: string
	purpose: string
	effectiveFrom: string
	expiresAt: string
	wardenDecisionRef: string
	riverEvidenceRef: string
}

export type DigitalMirrorMobilityDependencies = {
	evidence?: MobilityEvidenceSpine
	sessionRef?: string
}

export class DigitalMirrorMobilityState {
	private progress: MobilityProgressState = 'SESSION_BOUND'
	private readonly grants = new Map<string, MobilityCapabilityGrant>()
	private readonly revoked = new Set<string>()
	private readonly evidence?: MobilityEvidenceSpine
	private readonly sessionRef?: string

	public constructor(dependencies: DigitalMirrorMobilityDependencies = {}) {
		if (Boolean(dependencies.evidence) !== Boolean(dependencies.sessionRef)) {
			throw new Error('Mobility evidence and sessionRef must be supplied together')
		}
		this.evidence = dependencies.evidence
		this.sessionRef = dependencies.sessionRef
	}

	private appendEvidence(
		type:
			| 'DIGITAL_MIRROR_MOBILITY_STATE_CHANGED'
			| 'MOBILITY_CAPABILITY_GRANTED'
			| 'MOBILITY_CAPABILITY_REVOKED',
		payload: Record<string, unknown>,
		wardenDecisionRef?: string,
	): void {
		if (!this.evidence || !this.sessionRef) return
		this.evidence.append(this.sessionRef, type, payload, wardenDecisionRef)
	}

	public progressTo(state: MobilityProgressState): void {
		this.progress = state
		this.appendEvidence('DIGITAL_MIRROR_MOBILITY_STATE_CHANGED', { state })
	}

	public get progressState(): MobilityProgressState {
		return this.progress
	}

	public grant(grant: MobilityCapabilityGrant): void {
		if (!grant.purpose || !grant.wardenDecisionRef || !grant.riverEvidenceRef) {
			throw new Error(
				'Mobility grant requires purpose, Warden decision, and River evidence',
			)
		}

		const effectiveFrom = Date.parse(grant.effectiveFrom)
		const expiresAt = Date.parse(grant.expiresAt)
		if (
			Number.isNaN(effectiveFrom) ||
			Number.isNaN(expiresAt) ||
			expiresAt <= effectiveFrom
		) {
			throw new Error('Mobility grant expiry must be after effective time')
		}

		this.grants.set(grant.grantId, { ...grant })
		this.revoked.delete(grant.grantId)
		this.appendEvidence(
			'MOBILITY_CAPABILITY_GRANTED',
			{
				grantId: grant.grantId,
				digitalMeId: grant.digitalMeId,
				vehicleRelationshipRef: grant.vehicleRelationshipRef,
				capability: grant.capability,
				purpose: grant.purpose,
				effectiveFrom: grant.effectiveFrom,
				expiresAt: grant.expiresAt,
				riverEvidenceRef: grant.riverEvidenceRef,
			},
			grant.wardenDecisionRef,
		)
	}

	public revoke(grantId: string): void {
		if (!this.grants.has(grantId) || this.revoked.has(grantId)) return
		this.revoked.add(grantId)
		this.appendEvidence('MOBILITY_CAPABILITY_REVOKED', { grantId })
	}

	public hasCapability(capability: string, at: string): boolean {
		const time = Date.parse(at)
		if (Number.isNaN(time)) return false

		for (const grant of this.grants.values()) {
			if (this.revoked.has(grant.grantId)) continue
			if (grant.capability !== capability) continue
			if (
				Date.parse(grant.effectiveFrom) <= time &&
				time < Date.parse(grant.expiresAt)
			) {
				return true
			}
		}
		return false
	}
}
