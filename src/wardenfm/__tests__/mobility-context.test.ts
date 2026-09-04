import { normalizeMobilityContext } from '../mobility/context'
import { recommendContextMediaProfile } from '../mobility/media-router'

describe('Warden mobility context routing', () => {
	it('preserves unavailable facts as UNKNOWN', () => {
		expect(
			normalizeMobilityContext({ observedAt: '2026-09-04T12:00:00.000Z' }),
		).toEqual({
			observedAt: '2026-09-04T12:00:00.000Z',
			trafficState: 'UNKNOWN',
			routeComplexity: 'UNKNOWN',
			tripPhase: 'UNKNOWN',
			speedVarianceBand: 'UNKNOWN',
			adasPriority: 'NONE',
			sourceRefs: [],
		})
	})

	it('routes urgent ADAS above every ordinary media profile', () => {
		const context = normalizeMobilityContext({
			observedAt: '2026-09-04T12:00:00.000Z',
			trafficState: 'FREE_FLOW',
			routeComplexity: 'LOW',
			adasPriority: 'URGENT',
		})
		expect(
			recommendContextMediaProfile(context, { allowContextRouting: true }),
		).toBe('ADAS_PRIORITY')
	})

	it('routes high route complexity before traffic-based genre routing', () => {
		const context = normalizeMobilityContext({
			observedAt: '2026-09-04T12:00:00.000Z',
			trafficState: 'STOP_START',
			routeComplexity: 'HIGH',
		})
		expect(
			recommendContextMediaProfile(context, { allowContextRouting: true }),
		).toBe('NAV_PRIORITY')
	})

	it('falls back to user default when contextual routing is not admitted', () => {
		const context = normalizeMobilityContext({
			observedAt: '2026-09-04T12:00:00.000Z',
			trafficState: 'DENSE',
		})
		expect(
			recommendContextMediaProfile(context, { allowContextRouting: false }),
		).toBe('USER_DEFAULT')
	})
})
