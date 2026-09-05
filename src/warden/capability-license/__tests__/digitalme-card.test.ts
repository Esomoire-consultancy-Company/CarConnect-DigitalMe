import { projectDigitalMeCapabilityCard } from '../digitalme-card'
import {
	WARDEN_MOBILITY_REGISTRY_R01,
	createWardenMobilityLicence,
} from '../mobility-profile'

const licence = () =>
	createWardenMobilityLicence({
		principalRef: 'DM1',
		relationshipRef: 'VEH1',
		genesisRecordRef: 'GEN1',
		riverEvidenceRef: 'R1',
		issuedByRef: 'I1',
		effectiveFrom: '2026-09-05T00:00:00Z',
		expiresAt: '2026-09-06T00:00:00Z',
	})

describe('DigitalMe capability card projection', () => {
	it('never renders a licensed envelope as executable authority', () => {
		const card = projectDigitalMeCapabilityCard(
			licence(),
			WARDEN_MOBILITY_REGISTRY_R01,
			[],
			'2026-09-05T12:00:00Z',
		)
		const media = card.capabilities.find((x) => x.capabilityId === 'WARDENFM_MEDIA_CONTROL')
		expect(media?.state).toBe('AVAILABLE_WARDEN_ADMISSION_REQUIRED')
		expect(media).not.toHaveProperty('allowedNow')
	})

	it('shows external entitlement dependency explicitly', () => {
		const card = projectDigitalMeCapabilityCard(
			licence(),
			WARDEN_MOBILITY_REGISTRY_R01,
			[],
			'2026-09-05T12:00:00Z',
		)
		expect(card.capabilities.find((x) => x.capabilityId === 'MOBILITY_READ_ADAS_STATE')?.state).toBe(
			'LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED',
		)
	})

	it('projects revoked lifecycle state across grants', () => {
		const value = licence()
		value.status = 'REVOKED'
		const card = projectDigitalMeCapabilityCard(
			value,
			WARDEN_MOBILITY_REGISTRY_R01,
			[],
			'2026-09-05T12:00:00Z',
		)
		expect(card.capabilities.every((x) => x.state === 'REVOKED')).toBe(true)
	})

	it('projects time expiry without implying Warden execution authority', () => {
		const card = projectDigitalMeCapabilityCard(
			licence(),
			WARDEN_MOBILITY_REGISTRY_R01,
			[],
			'2026-09-06T00:00:00Z',
		)
		expect(card.capabilities.every((x) => x.state === 'EXPIRED')).toBe(true)
	})

	it('keeps draft licences as envelope-only state', () => {
		const value = licence()
		value.status = 'DRAFT'
		const card = projectDigitalMeCapabilityCard(
			value,
			WARDEN_MOBILITY_REGISTRY_R01,
			[],
			'2026-09-05T12:00:00Z',
		)
		expect(card.capabilities.every((x) => x.state === 'LICENSED_ENVELOPE')).toBe(true)
	})

	it('keeps future licences as envelope-only state', () => {
		const value = licence()
		value.effectiveFrom = '2026-09-05T13:00:00Z'
		const card = projectDigitalMeCapabilityCard(
			value,
			WARDEN_MOBILITY_REGISTRY_R01,
			[],
			'2026-09-05T12:00:00Z',
		)
		expect(card.capabilities.every((x) => x.state === 'LICENSED_ENVELOPE')).toBe(true)
	})
})
