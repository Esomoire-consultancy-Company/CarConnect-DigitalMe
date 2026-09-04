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

export class DigitalMirrorMobilityState {
	private progress: MobilityProgressState = 'SESSION_BOUND'
	private readonly grants = new Map<string, MobilityCapabilityGrant>()
	private readonly revoked = new Set<string>()

	public progressTo(state: MobilityProgressState): void {
		this.progress = state
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

		if (Date.parse(grant.expiresAt) <= Date.parse(grant.effectiveFrom)) {
			throw new Error('Mobility grant expiry must be after effective time')
		}

		this.grants.set(grant.grantId, { ...grant })
		this.revoked.delete(grant.grantId)
	}

	public revoke(grantId: string): void {
		if (this.grants.has(grantId)) this.revoked.add(grantId)
	}

	public hasCapability(capability: string, at: string): boolean {
		const time = Date.parse(at)
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
