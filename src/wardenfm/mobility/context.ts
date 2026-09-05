export type MobilityTrafficState =
	| 'UNKNOWN'
	| 'FREE_FLOW'
	| 'MODERATE'
	| 'DENSE'
	| 'STOP_START'

export type MobilityRouteComplexity = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH'
export type MobilityTripPhase =
	| 'UNKNOWN'
	| 'DEPARTURE'
	| 'CRUISE'
	| 'APPROACH'
	| 'ARRIVAL'
export type MobilitySpeedVarianceBand = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH'
export type AdasPriority = 'NONE' | 'INFORMATION' | 'CAUTION' | 'URGENT'

export type MobilityContextSnapshot = {
	observedAt: string
	trafficState: MobilityTrafficState
	routeComplexity: MobilityRouteComplexity
	tripPhase: MobilityTripPhase
	speedVarianceBand: MobilitySpeedVarianceBand
	adasPriority: AdasPriority
	sourceRefs: string[]
}

export type MobilityContextInput = Partial<
	Omit<MobilityContextSnapshot, 'observedAt'>
> & {
	observedAt: string
}

const TRAFFIC = new Set<MobilityTrafficState>([
	'UNKNOWN',
	'FREE_FLOW',
	'MODERATE',
	'DENSE',
	'STOP_START',
])
const ROUTE = new Set<MobilityRouteComplexity>([
	'UNKNOWN',
	'LOW',
	'MEDIUM',
	'HIGH',
])
const TRIP = new Set<MobilityTripPhase>([
	'UNKNOWN',
	'DEPARTURE',
	'CRUISE',
	'APPROACH',
	'ARRIVAL',
])
const SPEED = new Set<MobilitySpeedVarianceBand>([
	'UNKNOWN',
	'LOW',
	'MEDIUM',
	'HIGH',
])
const ADAS = new Set<AdasPriority>([
	'NONE',
	'INFORMATION',
	'CAUTION',
	'URGENT',
])

export function normalizeMobilityContext(
	input: MobilityContextInput,
): MobilityContextSnapshot {
	return {
		observedAt: input.observedAt,
		trafficState: TRAFFIC.has(input.trafficState as MobilityTrafficState)
			? input.trafficState!
			: 'UNKNOWN',
		routeComplexity: ROUTE.has(
			input.routeComplexity as MobilityRouteComplexity,
		)
			? input.routeComplexity!
			: 'UNKNOWN',
		tripPhase: TRIP.has(input.tripPhase as MobilityTripPhase)
			? input.tripPhase!
			: 'UNKNOWN',
		speedVarianceBand: SPEED.has(
			input.speedVarianceBand as MobilitySpeedVarianceBand,
		)
			? input.speedVarianceBand!
			: 'UNKNOWN',
		adasPriority: ADAS.has(input.adasPriority as AdasPriority)
			? input.adasPriority!
			: 'NONE',
		sourceRefs: [...(input.sourceRefs ?? [])],
	}
}
