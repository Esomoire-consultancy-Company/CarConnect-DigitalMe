import {
	MOBILITY_EFFECT_TO_LICENSE_EFFECT,
	WARDEN_MOBILITY_REGISTRY_R01,
	createWardenMobilityLicence,
} from '../mobility-profile'
import { validateCapabilityLicence } from '../licence'

describe('Warden Mobility capability licence profile', () => {
	it('marks safety-critical vehicle effects and ADB/Autolink privileged execution non-licensable', () => {
		const forbidden = [
			'VEHICLE_STEER',
			'VEHICLE_BRAKE',
			'VEHICLE_THROTTLE',
			'VEHICLE_AEB_CONTROL',
			'VEHICLE_ACC_CONTROL',
			'VEHICLE_CAN_WRITE',
			'ADB_EXECUTION',
			'AUTOLINK_PRIVILEGED_EXECUTION',
		]
		for (const id of forbidden) {
			expect(WARDEN_MOBILITY_REGISTRY_R01.effects.find((x) => x.effectId === id)?.licensable).toBe(
				false,
			)
		}
	})

	it('produces a valid read-only/advisory Mobility licence', () => {
		const value = createWardenMobilityLicence({
			principalRef: 'DM1',
			relationshipRef: 'VEH1',
			genesisRecordRef: 'GEN1',
			riverEvidenceRef: 'R1',
			issuedByRef: 'I1',
			effectiveFrom: '2026-09-05T00:00:00Z',
			expiresAt: '2026-09-06T00:00:00Z',
		})
		expect(validateCapabilityLicence(value, WARDEN_MOBILITY_REGISTRY_R01)).toEqual([])
	})

	it('maps the complete existing R0.2 Mobility effect vocabulary', () => {
		expect(Object.keys(MOBILITY_EFFECT_TO_LICENSE_EFFECT).sort()).toEqual(
			[
				'APPLY_CONTEXT_PROFILE',
				'DIGITAL_MIRROR_GRANT',
				'DUCK_MEDIA',
				'NEXT_MEDIA',
				'PAUSE_MEDIA',
				'PREVIOUS_MEDIA',
				'RESUME_MEDIA',
				'VOICE_EXPLANATION',
			].sort(),
		)
	})

	it('keeps ADAS capability free of vehicle-actuation effects', () => {
		const adas = WARDEN_MOBILITY_REGISTRY_R01.capabilities.find(
			(x) => x.capabilityId === 'MOBILITY_READ_ADAS_STATE',
		)
		expect(adas?.allowedEffectIds.some((id) => id.startsWith('VEHICLE_'))).toBe(false)
	})
})
