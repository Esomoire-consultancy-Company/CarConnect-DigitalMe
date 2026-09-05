import {
	evaluateRequiredEntitlements,
	type ExternalEntitlementAssertion,
} from '../entitlement'

const base = (
	overrides: Partial<ExternalEntitlementAssertion> = {},
): ExternalEntitlementAssertion => ({
	entitlementId: 'OEM1',
	provider: 'oem',
	subjectRef: 'DM1',
	capabilityId: 'C1',
	status: 'VALID',
	observedAt: '2026-09-05T00:00:00Z',
	evidenceRef: 'R1',
	...overrides,
})

describe('external entitlement evaluation', () => {
	it('denies missing required entitlement', () => {
		expect(evaluateRequiredEntitlements(['OEM1'], [], '2026-09-05T12:00:00Z').reason).toBe(
			'EXTERNAL_ENTITLEMENT_MISSING',
		)
	})

	it('denies UNKNOWN entitlement', () => {
		expect(
			evaluateRequiredEntitlements(
				['OEM1'],
				[base({ status: 'UNKNOWN' })],
				'2026-09-05T12:00:00Z',
			).reason,
		).toBe('EXTERNAL_ENTITLEMENT_UNKNOWN')
	})

	it('denies INVALID entitlement', () => {
		expect(
			evaluateRequiredEntitlements(
				['OEM1'],
				[base({ status: 'INVALID' })],
				'2026-09-05T12:00:00Z',
			).reason,
		).toBe('EXTERNAL_ENTITLEMENT_INVALID')
	})

	it('denies expired entitlement', () => {
		expect(
			evaluateRequiredEntitlements(
				['OEM1'],
				[base({ expiresAt: '2026-09-05T11:59:00Z' })],
				'2026-09-05T12:00:00Z',
			).reason,
		).toBe('EXTERNAL_ENTITLEMENT_EXPIRED')
	})

	it('accepts valid required entitlement', () => {
		expect(
			evaluateRequiredEntitlements(['OEM1'], [base()], '2026-09-05T12:00:00Z'),
		).toEqual({ matched: true })
	})

	it('accepts capabilities with no external entitlement requirement', () => {
		expect(evaluateRequiredEntitlements([], [], '2026-09-05T12:00:00Z')).toEqual({ matched: true })
	})
})
