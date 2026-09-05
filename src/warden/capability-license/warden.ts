import type {
	CapabilityAdmissionRequest,
	LicenceEvaluationResult,
} from './evaluator'

export type WardenCapabilityDecision = {
	decision: 'ALLOW' | 'DENY'
	reasonCodes: string[]
	licenceEvaluationRef: string
	wardenDecisionRef: string
	policyVersion: string
	evaluatedAt: string
}

export interface WardenCapabilityAdmissionPort {
	decide(
		request: CapabilityAdmissionRequest,
		evaluation: LicenceEvaluationResult,
	): Promise<WardenCapabilityDecision>
}

export async function requestWardenDecision(
	evaluation: LicenceEvaluationResult,
	request: CapabilityAdmissionRequest,
	warden: WardenCapabilityAdmissionPort,
): Promise<WardenCapabilityDecision | undefined> {
	if (evaluation.decision !== 'MATCH') return undefined
	return warden.decide(request, evaluation)
}
