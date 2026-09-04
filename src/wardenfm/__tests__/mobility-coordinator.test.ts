import { readFileSync } from 'fs'
import { normalizeMobilityContext } from '../mobility/context'
import { WardenMobilityCoordinator } from '../mobility/coordinator'

describe('Warden mobility coordinator', () => {
	it('does not execute a recommended media profile when Warden denies it', async () => {
		const effects: string[] = []
		const coordinator = new WardenMobilityCoordinator(
			{
				decide: async () => ({
					allowed: false,
					wardenDecisionRef: 'w-deny',
				}),
			},
			{
				execute: async (effect) => {
					effects.push(effect)
				},
			},
		)
		const context = normalizeMobilityContext({
			observedAt: '2026-09-04T12:00:00.000Z',
			trafficState: 'DENSE',
		})
		await coordinator.recommendProfile(
			context,
			{ allowContextRouting: true },
			'dm-session-1',
		)
		expect(effects).toEqual([])
	})

	it('urgent ADAS may request media ducking but never vehicle actuation', async () => {
		const effects: string[] = []
		const coordinator = new WardenMobilityCoordinator(
			{
				decide: async () => ({
					allowed: true,
					wardenDecisionRef: 'w-allow',
				}),
			},
			{
				execute: async (effect) => {
					effects.push(effect)
				},
			},
		)
		const context = normalizeMobilityContext({
			observedAt: '2026-09-04T12:00:00.000Z',
			adasPriority: 'URGENT',
		})
		await coordinator.handleUrgentAdas(context, 'dm-session-1')
		expect(effects).toEqual(['DUCK_MEDIA'])
	})

	it('exposes no safety-critical vehicle actuation effect', () => {
		const source = readFileSync(require.resolve('../mobility/admission'), 'utf8')
		for (const term of ['STEER', 'BRAKE', 'THROTTLE', 'AEB', 'ACC', 'CAN_WRITE']) {
			expect(source).not.toContain(`'${term}'`)
		}
	})
})
