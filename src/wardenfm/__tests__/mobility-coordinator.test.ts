import { readFileSync } from 'fs'
import { normalizeMobilityContext } from '../mobility/context'
import { WardenMobilityCoordinator } from '../mobility/coordinator'
import { MobilityEvidenceSpine } from '../mobility/evidence'
import { normalizeGestureCandidate } from '../mobility/gesture'
import { normalizeVoiceIntentCandidate } from '../mobility/voice-intent'

describe('Warden mobility coordinator', () => {
	const makeEvidence = () => {
		let id = 0
		return new MobilityEvidenceSpine({
			idFactory: () => `m-${++id}`,
			now: () => '2026-09-04T12:00:00.000Z',
		})
	}

	const makeCoordinator = (evidence: MobilityEvidenceSpine) =>
		new WardenMobilityCoordinator(
			{
				decide: async () => ({
					allowed: true,
					wardenDecisionRef: 'w-allow',
				}),
			},
			{ execute: async () => undefined },
			evidence,
		)

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

	it('records bounded voice, gesture, and step-up evidence without raw media', () => {
		const evidence = makeEvidence()
		const coordinator = makeCoordinator(evidence)
		const voice = normalizeVoiceIntentCandidate({
			intent: 'PAUSE_MEDIA',
			confidence: 0.92,
			threshold: 0.8,
			sourceRef: 'voice-1',
			sessionRef: 'dm-session-1',
		})
		const gesture = normalizeGestureCandidate({
			token: 'THUMBS_UP',
			confidence: 0.95,
			threshold: 0.8,
			sourceRef: 'gesture-1',
			sessionRef: 'dm-session-1',
		})

		coordinator.recordVoiceIntent(voice)
		coordinator.recordGestureToken(gesture)
		coordinator.recordStepUpConfirmationRequest(
			'dm-session-1',
			'challenge-1',
			'context-media-routing',
		)
		coordinator.recordStepUpConfirmationDecision(
			'dm-session-1',
			'challenge-1',
			'gesture-1',
			true,
			'w-stepup-1',
		)

		expect(evidence.events.map((event) => event.type)).toEqual([
			'VOICE_INTENT_RECOGNIZED',
			'GESTURE_TOKEN_RECOGNIZED',
			'STEP_UP_CONFIRMATION_REQUESTED',
			'STEP_UP_CONFIRMATION_DECIDED',
		])
		expect(evidence.events[0].payload).toEqual({
			voiceIntentToken: 'PAUSE_MEDIA',
			confidence: 0.92,
			sourceRef: 'voice-1',
		})
		expect(evidence.events[1].payload).toEqual({
			gestureToken: 'THUMBS_UP',
			confidence: 0.95,
			sourceRef: 'gesture-1',
		})
		expect(evidence.events[3].wardenDecisionRef).toBe('w-stepup-1')
	})

	it('exposes no safety-critical vehicle actuation effect', () => {
		const source = readFileSync(require.resolve('../mobility/admission'), 'utf8')
		for (const term of ['STEER', 'BRAKE', 'THROTTLE', 'AEB', 'ACC', 'CAN_WRITE']) {
			expect(source).not.toContain(`'${term}'`)
		}
	})
})
