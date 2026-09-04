import type { WardenMobilityAdmissionPort, MobilityEffect } from './admission'
import type { MobilityContextSnapshot } from './context'
import { MobilityEvidenceSpine } from './evidence'
import {
	recommendContextMediaProfile,
	type ContextMediaPreferences,
	type ContextMediaProfile,
} from './media-router'

export interface MobilityEffectPort {
	execute(effect: MobilityEffect, data?: Record<string, unknown>): Promise<void>
}

export class WardenMobilityCoordinator {
	public constructor(
		private readonly warden: WardenMobilityAdmissionPort,
		private readonly effects: MobilityEffectPort,
		private readonly evidence?: MobilityEvidenceSpine,
	) {}

	private recordContext(
		context: MobilityContextSnapshot,
		digitalMeSessionRef: string,
	): void {
		this.evidence?.append(digitalMeSessionRef, 'MOBILITY_CONTEXT_OBSERVED', {
			trafficState: context.trafficState,
			routeComplexity: context.routeComplexity,
			tripPhase: context.tripPhase,
			speedVarianceBand: context.speedVarianceBand,
			adasPriority: context.adasPriority,
			sourceRefs: [...context.sourceRefs],
			observedAt: context.observedAt,
		})
	}

	public async requestEffect(
		effect: MobilityEffect,
		purpose: string,
		digitalMeSessionRef: string,
		data?: Record<string, unknown>,
	): Promise<boolean> {
		const decision = await this.warden.decide({
			effect,
			purpose,
			digitalMeSessionRef,
		})

		this.evidence?.append(
			digitalMeSessionRef,
			'MOBILITY_EFFECT_ADMISSION_DECIDED',
			{ effect, purpose, allowed: decision.allowed },
			decision.wardenDecisionRef,
		)

		if (!decision.allowed) return false
		await this.effects.execute(effect, data)
		this.evidence?.append(
			digitalMeSessionRef,
			'MOBILITY_EFFECT_VERIFIED',
			{ effect, purpose, result: 'EXECUTED' },
			decision.wardenDecisionRef,
		)
		return true
	}

	public async recommendProfile(
		context: MobilityContextSnapshot,
		preferences: ContextMediaPreferences,
		digitalMeSessionRef: string,
	): Promise<ContextMediaProfile> {
		this.recordContext(context, digitalMeSessionRef)
		const profile = recommendContextMediaProfile(context, preferences)
		this.evidence?.append(
			digitalMeSessionRef,
			'CONTEXT_MEDIA_PROFILE_RECOMMENDED',
			{ profile },
		)
		if (profile === 'USER_DEFAULT') return profile

		const admitted = await this.requestEffect(
			'APPLY_CONTEXT_PROFILE',
			'driver-context-media-routing',
			digitalMeSessionRef,
			{ profile },
		)
		if (admitted) {
			this.evidence?.append(
				digitalMeSessionRef,
				'CONTEXT_MEDIA_PROFILE_ADMITTED',
				{ profile },
			)
		}
		return profile
	}

	public async handleUrgentAdas(
		context: MobilityContextSnapshot,
		digitalMeSessionRef: string,
	): Promise<boolean> {
		if (context.adasPriority !== 'URGENT') return false
		this.recordContext(context, digitalMeSessionRef)
		return this.requestEffect(
			'DUCK_MEDIA',
			'adas-distraction-reduction',
			digitalMeSessionRef,
		)
	}
}
