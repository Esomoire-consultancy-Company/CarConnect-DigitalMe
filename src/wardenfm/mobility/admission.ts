export type MobilityEffect =
	| 'PAUSE_MEDIA'
	| 'RESUME_MEDIA'
	| 'NEXT_MEDIA'
	| 'PREVIOUS_MEDIA'
	| 'APPLY_CONTEXT_PROFILE'
	| 'DUCK_MEDIA'
	| 'VOICE_EXPLANATION'
	| 'DIGITAL_MIRROR_GRANT'

export type MobilityAdmissionRequest = {
	effect: MobilityEffect
	purpose: string
	digitalMeSessionRef: string
	contextRef?: string
	confirmationRef?: string
}

export type MobilityAdmissionDecision = {
	allowed: boolean
	wardenDecisionRef: string
}

export interface WardenMobilityAdmissionPort {
	decide(request: MobilityAdmissionRequest): Promise<MobilityAdmissionDecision>
}
