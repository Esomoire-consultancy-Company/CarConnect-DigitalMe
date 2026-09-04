import { readFileSync } from 'fs'
import { normalizeMobilityContext } from '../mobility/context'
import { WardenMobilityCoordinator } from '../mobility/coordinator'
import { MobilityEvidenceSpine } from '../mobility/evidence'

describe('Warden mobility coordinator', () => {
	const makeEvidence = () => {
		let id = 0
		return new MobilityEvidenceSpine({
			idFactory: () => `m-${++id}`,
			now: () => '2026-09-04T12:00:00.000Z',
		})
	}

	it('does not execute a recommended media profile when Warden denies it', async () => {
		const effects: string[] = []
		const evidence = makeEvidence()
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
			evidence,
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
		expect(evidence.events.map((event) => event.type)).toEqual([
			'MOBILITY_CONTEXT_OBSERVED',
			'CONTEXT_MEDIA_PROFILE_RECOMMENDED',
			'MOBILITY_EFFECT_ADMISSION_DECIDED',
		])
		expect(evidence.events[2]).toMatchObject({
			wardenDecisionRef: 'w-deny',
			payload: { effect: 'APPLY_CONTEXT_PROFILE', allowed: false },
		})
	})

	it('urgent ADAS may request media ducking but never vehicle actuation', async () => {
		const effects: string[] = []
		const evidence = makeEvidence()
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
			evidence,
		)
		const context = normalizeMobilityContext({
			observedAt: '2026-09-04T12:00:00.000Z',
			adasPriority: 'URGENT',
		})
		await coordinator.handleUrgentAdas(context, 'dm-session-1')
		expect(effects).toEqual(['DUCK_MEDIA'])
		expect(evidence.events.map((event) => event.type)).toEqual([
			'MOBILITY_CONTEXT_OBSERVED',
			'MOBILITY_EFFECT_ADMISSION_DECIDED',
			'MOBILITY_EFFECT_VERIFIED',
		])
		expect(evidence.events[2].priorEventRef).toBe('m-2')
	})

	it('exposes no safety-critical vehicle actuation effect', () => {
		const source = readFileSync(require.resolve('../mobility/admission'), 'utf8')
		for (const term of ['STEER', 'BRAKE', 'THROTTLE', 'AEB', 'ACC', 'CAN_WRITE']) {
			expect(source).not.toContain(`'${term}'`)
		}
	})
})
