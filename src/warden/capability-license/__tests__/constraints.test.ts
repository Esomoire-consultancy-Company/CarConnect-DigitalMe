import { evaluateContextConstraints, validateContextConstraint } from '../constraints'

describe('capability licence context constraints', () => {
	it('fails required missing context', () => {
		expect(
			evaluateContextConstraints([{ key: 'vehicleRef', operator: 'EXISTS', required: true }], {}),
		).toEqual({ matched: false, reason: 'CONTEXT_REQUIRED_MISSING' })
	})

	it('evaluates bounded numeric and membership operators', () => {
		expect(
			evaluateContextConstraints(
				[
					{ key: 'speed', operator: 'LTE', value: 5, required: true },
					{ key: 'mode', operator: 'IN', value: ['PARKED', 'IDLE'], required: true },
				],
				{ speed: 0, mode: 'PARKED' },
			).matched,
		).toBe(true)
	})

	it('rejects invalid operator/value combinations at validation time', () => {
		expect(
			validateContextConstraint({ key: 'mode', operator: 'IN', value: 'PARKED', required: true }),
		).toContain('IN_REQUIRES_STRING_ARRAY')
	})

	it('fails a numeric constraint that does not match', () => {
		expect(
			evaluateContextConstraints(
				[{ key: 'speed', operator: 'GTE', value: 10, required: true }],
				{ speed: 5 },
			),
		).toEqual({ matched: false, reason: 'CONTEXT_CONSTRAINT_FAILED' })
	})
})
