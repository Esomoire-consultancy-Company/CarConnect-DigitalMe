import { CapabilityLicenseEvidenceSpine } from '../evidence'

describe('capability licence evidence spine', () => {
	it('chains licence evaluation and Warden decision separately', () => {
		let n = 0
		const spine = new CapabilityLicenseEvidenceSpine({
			idFactory: () => `E${++n}`,
			now: () => '2026-09-05T12:00:00Z',
		})
		spine.append('S1', 'CAPABILITY_LICENCE_MATCH_EVALUATED', {
			licenceRef: 'L1',
			matchedGrantRef: 'G1',
		})
		spine.append('S1', 'WARDEN_CAPABILITY_DECISION_RECORDED', {
			wardenDecisionRef: 'WD1',
			decision: 'ALLOW',
		})
		expect(spine.events[1].priorEventRef).toBe('E1')
		expect(Object.isFrozen(spine.events)).toBe(true)
		expect(Object.isFrozen(spine.events[0])).toBe(true)
	})

	it.each([
		'providerSecret',
		'accessToken',
		'rawFrame',
		'continuousRawAudio',
		'biometricTemplate',
	])('rejects sensitive evidence field %s recursively', (key) => {
		const spine = new CapabilityLicenseEvidenceSpine({
			idFactory: () => 'E1',
			now: () => '2026-09-05T12:00:00Z',
		})
		expect(() =>
			spine.append('S1', 'CAPABILITY_ADMISSION_REQUESTED', {
				nested: { [key]: 'x' },
			}),
		).toThrow()
	})

	it('maintains prior-event chains per session', () => {
		let n = 0
		const spine = new CapabilityLicenseEvidenceSpine({
			idFactory: () => `Q${++n}`,
			now: () => '2026-09-05T12:00:00Z',
		})
		spine.append('A', 'CAPABILITY_ADMISSION_REQUESTED', { requestId: 'R1' })
		spine.append('B', 'CAPABILITY_ADMISSION_REQUESTED', { requestId: 'R2' })
		spine.append('A', 'CAPABILITY_LICENCE_MATCH_EVALUATED', { licenceRef: 'L1' })
		expect(spine.events[2].priorEventRef).toBe('Q1')
	})
})
