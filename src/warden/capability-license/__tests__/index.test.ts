import {
	WARDEN_MOBILITY_REGISTRY_R01,
	evaluateCapabilityLicence,
	projectDigitalMeCapabilityCard,
	requestWardenDecision,
	validateRegistry,
} from '../index'

describe('capability licence public exports', () => {
	it('exports the stable R0.1 package surface', () => {
		expect(typeof validateRegistry).toBe('function')
		expect(typeof evaluateCapabilityLicence).toBe('function')
		expect(typeof requestWardenDecision).toBe('function')
		expect(Array.isArray(WARDEN_MOBILITY_REGISTRY_R01.capabilities)).toBe(true)
		expect(typeof projectDigitalMeCapabilityCard).toBe('function')
	})
})
