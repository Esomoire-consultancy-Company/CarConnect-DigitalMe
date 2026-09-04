import type { WardenMobilityAdmissionPort, MobilityEffect } from './admission'
import type { MobilityContextSnapshot } from './context'
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
	) {}

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
		if (!decision.allowed) return false
		await this.effects.execute(effect, data)
		return true
	}

	public async recommendProfile(
		context: MobilityContextSnapshot,
		preferences: ContextMediaPreferences,
		digitalMeSessionRef: string,
	): Promise<ContextMediaProfile> {
		const profile = recommendContextMediaProfile(context, preferences)
		if (profile === 'USER_DEFAULT') return profile
		await this.requestEffect(
			'APPLY_CONTEXT_PROFILE',
			'driver-context-media-routing',
			digitalMeSessionRef,
			{ profile },
		)
		return profile
	}

	public async handleUrgentAdas(
		context: MobilityContextSnapshot,
		digitalMeSessionRef: string,
	): Promise<boolean> {
		if (context.adasPriority !== 'URGENT') return false
		return this.requestEffect(
			'DUCK_MEDIA',
			'adas-distraction-reduction',
			digitalMeSessionRef,
		)
	}
}
