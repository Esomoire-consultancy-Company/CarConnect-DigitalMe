import type { MobilityContextSnapshot } from './context'

export type ContextMediaProfile =
	| 'FOCUS_LOW_COMPLEXITY'
	| 'CRUISE'
	| 'ENERGY'
	| 'CALM'
	| 'WARDEN_BRIEFING'
	| 'NAV_PRIORITY'
	| 'ADAS_PRIORITY'
	| 'USER_DEFAULT'

export type ContextMediaPreferences = {
	allowContextRouting: boolean
	preferredCruiseProfile?: Extract<
		ContextMediaProfile,
		'CRUISE' | 'ENERGY' | 'CALM'
	>
}

export function recommendContextMediaProfile(
	context: MobilityContextSnapshot,
	preferences: ContextMediaPreferences,
): ContextMediaProfile {
	if (!preferences.allowContextRouting) return 'USER_DEFAULT'
	if (context.adasPriority === 'URGENT') return 'ADAS_PRIORITY'
	if (context.routeComplexity === 'HIGH') return 'NAV_PRIORITY'
	if (
		context.trafficState === 'DENSE' ||
		context.trafficState === 'STOP_START'
	) {
		return 'FOCUS_LOW_COMPLEXITY'
	}
	if (
		context.tripPhase === 'CRUISE' &&
		context.trafficState === 'FREE_FLOW'
	) {
		return preferences.preferredCruiseProfile ?? 'CRUISE'
	}
	return 'USER_DEFAULT'
}
