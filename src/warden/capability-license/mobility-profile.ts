import type { CapabilityLicenseRegistry } from './registry'
import type { CapabilityLicence } from './licence'

export const MOBILITY_EFFECT_TO_LICENSE_EFFECT = {
	PAUSE_MEDIA: 'MEDIA_PAUSE',
	RESUME_MEDIA: 'MEDIA_RESUME',
	NEXT_MEDIA: 'MEDIA_NEXT',
	PREVIOUS_MEDIA: 'MEDIA_PREVIOUS',
	APPLY_CONTEXT_PROFILE: 'MEDIA_PROFILE_APPLY',
	DUCK_MEDIA: 'MEDIA_DUCK',
	VOICE_EXPLANATION: 'VOICE_EXPLANATION_PRESENT',
	DIGITAL_MIRROR_GRANT: 'DIGITAL_MIRROR_CAPABILITY_GRANT',
} as const

const effects: CapabilityLicenseRegistry['effects'] = [
	['MEDIA_PAUSE', 'pause media', 'NON_SAFETY', true],
	['MEDIA_RESUME', 'resume media', 'NON_SAFETY', true],
	['MEDIA_NEXT', 'next media', 'NON_SAFETY', true],
	['MEDIA_PREVIOUS', 'previous media', 'NON_SAFETY', true],
	['MEDIA_DUCK', 'duck media', 'NON_SAFETY', true],
	['MEDIA_PROFILE_APPLY', 'apply media profile', 'NON_SAFETY', true],
	['VOICE_EXPLANATION_PRESENT', 'present voice explanation', 'NON_SAFETY', true],
	[
		'DIGITAL_MIRROR_CAPABILITY_GRANT',
		'grant scoped Digital Mirror capability',
		'NON_SAFETY',
		true,
	],
	['VEHICLE_STEER', 'steer vehicle', 'SAFETY_CRITICAL', false],
	['VEHICLE_BRAKE', 'apply vehicle brake', 'SAFETY_CRITICAL', false],
	['VEHICLE_THROTTLE', 'control throttle', 'SAFETY_CRITICAL', false],
	['VEHICLE_AEB_CONTROL', 'control AEB', 'SAFETY_CRITICAL', false],
	['VEHICLE_ACC_CONTROL', 'control ACC', 'SAFETY_CRITICAL', false],
	['VEHICLE_CAN_WRITE', 'write vehicle CAN', 'SAFETY_CRITICAL', false],
	['ADB_EXECUTION', 'execute ADB', 'SAFETY_RELATED', false],
	[
		'AUTOLINK_PRIVILEGED_EXECUTION',
		'privileged Autolink execution',
		'SAFETY_RELATED',
		false,
	],
].map(([effectId, description, safetyClass, licensable]) => ({
	effectId: effectId as string,
	version: '1',
	domain: 'mobility',
	description: description as string,
	safetyClass: safetyClass as 'NON_SAFETY' | 'SAFETY_RELATED' | 'SAFETY_CRITICAL',
	licensable: licensable as boolean,
	requiresEffectVerification: true,
}))

export const WARDEN_MOBILITY_REGISTRY_R01: CapabilityLicenseRegistry = {
	capabilities: [
		{
			capabilityId: 'WARDENFM_MEDIA_CONTROL',
			version: '1',
			domain: 'mobility',
			description: 'bounded media control',
			requiredExternalEntitlementIds: [],
			allowedPurposeIds: ['DRIVER_MEDIA_CONTROL'],
			allowedInputDataClassIds: [],
			allowedEffectIds: ['MEDIA_PAUSE', 'MEDIA_RESUME', 'MEDIA_NEXT', 'MEDIA_PREVIOUS'],
			prohibitedEffectIds: [],
			licensable: true,
		},
		{
			capabilityId: 'WARDENFM_CONTEXT_MEDIA_ROUTE',
			version: '1',
			domain: 'mobility',
			description: 'contextual media routing',
			requiredExternalEntitlementIds: [],
			allowedPurposeIds: ['DRIVER_MEDIA_PERSONALISATION', 'DISTRACTION_REDUCTION'],
			allowedInputDataClassIds: [
				'TRAFFIC_STATE',
				'ROUTE_COMPLEXITY',
				'TRIP_PHASE',
				'READ_ONLY_ADAS_STATE',
				'MEDIA_PREFERENCE',
			],
			allowedEffectIds: ['MEDIA_PROFILE_APPLY', 'MEDIA_DUCK'],
			prohibitedEffectIds: [],
			licensable: true,
		},
		{
			capabilityId: 'WARDEN_VOICE_INTENT',
			version: '1',
			domain: 'mobility',
			description: 'normalized voice intent',
			requiredExternalEntitlementIds: [],
			allowedPurposeIds: [
				'DRIVER_MEDIA_CONTROL',
				'DRIVER_CONTEXT_EXPLANATION',
				'DISTRACTION_REDUCTION',
			],
			allowedInputDataClassIds: ['VOICE_INTENT_TOKEN'],
			allowedEffectIds: [
				'MEDIA_PAUSE',
				'MEDIA_RESUME',
				'MEDIA_NEXT',
				'MEDIA_PREVIOUS',
				'MEDIA_DUCK',
				'VOICE_EXPLANATION_PRESENT',
			],
			prohibitedEffectIds: [],
			licensable: true,
		},
		{
			capabilityId: 'WARDEN_GESTURE_INTENT',
			version: '1',
			domain: 'mobility',
			description: 'normalized gesture intent',
			requiredExternalEntitlementIds: [],
			allowedPurposeIds: ['DRIVER_MEDIA_CONTROL', 'MOBILITY_STEP_UP_CONFIRMATION'],
			allowedInputDataClassIds: ['GESTURE_INTENT_TOKEN'],
			allowedEffectIds: ['MEDIA_PAUSE', 'MEDIA_NEXT', 'MEDIA_PREVIOUS'],
			prohibitedEffectIds: [],
			licensable: true,
		},
		{
			capabilityId: 'MOBILITY_READ_ADAS_STATE',
			version: '1',
			domain: 'mobility',
			description: 'read-only ADAS awareness',
			requiredExternalEntitlementIds: ['OEM_ADAS_READ'],
			allowedPurposeIds: ['DRIVER_CONTEXT_EXPLANATION', 'DISTRACTION_REDUCTION'],
			allowedInputDataClassIds: ['READ_ONLY_ADAS_STATE'],
			allowedEffectIds: ['VOICE_EXPLANATION_PRESENT', 'MEDIA_DUCK'],
			prohibitedEffectIds: [],
			licensable: true,
		},
		{
			capabilityId: 'DIGITAL_MIRROR_MOBILITY_PROGRESS',
			version: '1',
			domain: 'mobility',
			description: 'mobility progression bookkeeping',
			requiredExternalEntitlementIds: [],
			allowedPurposeIds: ['DIGITAL_MIRROR_MOBILITY_PROGRESSION'],
			allowedInputDataClassIds: [],
			allowedEffectIds: ['DIGITAL_MIRROR_CAPABILITY_GRANT'],
			prohibitedEffectIds: [],
			licensable: true,
		},
	],
	purposes: [
		['DRIVER_MEDIA_CONTROL', 'driver media control'],
		['DRIVER_MEDIA_PERSONALISATION', 'driver media personalisation'],
		['DISTRACTION_REDUCTION', 'distraction reduction'],
		['DRIVER_CONTEXT_EXPLANATION', 'driver context explanation'],
		['MOBILITY_STEP_UP_CONFIRMATION', 'mobility step-up confirmation'],
		[
			'DIGITAL_MIRROR_MOBILITY_PROGRESSION',
			'Digital Mirror mobility progression',
		],
	].map(([purposeId, description]) => ({
		purposeId,
		version: '1',
		domain: 'mobility',
		description,
		compatibleCapabilityIds: [],
	})),
	dataClasses: [
		['TRAFFIC_STATE', 'INTERNAL', 'TRANSIENT', false, false, false],
		['ROUTE_COMPLEXITY', 'INTERNAL', 'TRANSIENT', false, false, false],
		['TRIP_PHASE', 'INTERNAL', 'TRANSIENT', false, false, false],
		['READ_ONLY_ADAS_STATE', 'SENSITIVE', 'TRANSIENT', false, false, false],
		['MEDIA_PREFERENCE', 'PERSONAL', 'SESSION', false, false, false],
		['VOICE_INTENT_TOKEN', 'PERSONAL', 'TRANSIENT', false, false, false],
		['GESTURE_INTENT_TOKEN', 'PERSONAL', 'TRANSIENT', false, false, false],
		['RAW_CABIN_VIDEO', 'RESTRICTED', 'NONE', true, false, false],
		['CONTINUOUS_RAW_AUDIO', 'RESTRICTED', 'NONE', true, false, false],
		['VOICEPRINT_TEMPLATE', 'RESTRICTED', 'NONE', false, true, false],
		['FACE_BIOMETRIC_TEMPLATE', 'RESTRICTED', 'NONE', false, true, false],
		['HAND_BIOMETRIC_TEMPLATE', 'RESTRICTED', 'NONE', false, true, false],
		['PROVIDER_SECRET', 'RESTRICTED', 'NONE', false, false, true],
		['ACCESS_TOKEN_SECRET', 'RESTRICTED', 'NONE', false, false, true],
	].map(([dataClassId, sensitivity, retentionDefault, rawMedia, biometric, secret]) => ({
		dataClassId: dataClassId as string,
		version: '1',
		sensitivity: sensitivity as
			| 'PUBLIC'
			| 'INTERNAL'
			| 'PERSONAL'
			| 'SENSITIVE'
			| 'RESTRICTED',
		retentionDefault: retentionDefault as 'NONE' | 'TRANSIENT' | 'SESSION' | 'EVIDENCE_BOUNDED',
		rawMedia: rawMedia as boolean,
		biometric: biometric as boolean,
		secret: secret as boolean,
	})),
	effects,
}

export type CreateWardenMobilityLicenceInput = {
	principalRef: string
	relationshipRef: string
	genesisRecordRef: string
	riverEvidenceRef: string
	issuedByRef: string
	effectiveFrom: string
	expiresAt: string
	issuedAt?: string
	licenceId?: string
	licenceVersion?: string
	wardenPolicyVersion?: string
}

export function createWardenMobilityLicence(
	input: CreateWardenMobilityLicenceInput,
): CapabilityLicence {
	return {
		licenceId: input.licenceId ?? 'WARDEN-MOBILITY-CAPABILITY-LICENSE-001',
		licenceVersion: input.licenceVersion ?? '1',
		schemaVersion: 'R0.1',
		holder: { principalType: 'DigitalMe', principalRef: input.principalRef },
		relationship: { relationshipType: 'vehicle', relationshipRef: input.relationshipRef },
		grants: [
			{
				grantId: 'MOB-GRANT-MEDIA',
				capabilityId: 'WARDENFM_MEDIA_CONTROL',
				capabilityVersion: '1',
				purposeIds: ['DRIVER_MEDIA_CONTROL'],
				allowedDataClassIds: [],
				prohibitedDataClassIds: [],
				allowedEffectIds: ['MEDIA_PAUSE', 'MEDIA_RESUME', 'MEDIA_NEXT', 'MEDIA_PREVIOUS'],
				prohibitedEffectIds: [],
				requiredExternalEntitlementIds: [],
				contextConstraints: [],
			},
			{
				grantId: 'MOB-GRANT-CONTEXT',
				capabilityId: 'WARDENFM_CONTEXT_MEDIA_ROUTE',
				capabilityVersion: '1',
				purposeIds: ['DRIVER_MEDIA_PERSONALISATION', 'DISTRACTION_REDUCTION'],
				allowedDataClassIds: [
					'TRAFFIC_STATE',
					'ROUTE_COMPLEXITY',
					'TRIP_PHASE',
					'READ_ONLY_ADAS_STATE',
					'MEDIA_PREFERENCE',
				],
				prohibitedDataClassIds: [],
				allowedEffectIds: ['MEDIA_PROFILE_APPLY', 'MEDIA_DUCK'],
				prohibitedEffectIds: [],
				requiredExternalEntitlementIds: [],
				contextConstraints: [],
			},
			{
				grantId: 'MOB-GRANT-VOICE',
				capabilityId: 'WARDEN_VOICE_INTENT',
				capabilityVersion: '1',
				purposeIds: [
					'DRIVER_MEDIA_CONTROL',
					'DRIVER_CONTEXT_EXPLANATION',
					'DISTRACTION_REDUCTION',
				],
				allowedDataClassIds: ['VOICE_INTENT_TOKEN'],
				prohibitedDataClassIds: [],
				allowedEffectIds: [
					'MEDIA_PAUSE',
					'MEDIA_RESUME',
					'MEDIA_NEXT',
					'MEDIA_PREVIOUS',
					'MEDIA_DUCK',
					'VOICE_EXPLANATION_PRESENT',
				],
				prohibitedEffectIds: [],
				requiredExternalEntitlementIds: [],
				contextConstraints: [],
			},
			{
				grantId: 'MOB-GRANT-GESTURE',
				capabilityId: 'WARDEN_GESTURE_INTENT',
				capabilityVersion: '1',
				purposeIds: ['DRIVER_MEDIA_CONTROL', 'MOBILITY_STEP_UP_CONFIRMATION'],
				allowedDataClassIds: ['GESTURE_INTENT_TOKEN'],
				prohibitedDataClassIds: [],
				allowedEffectIds: ['MEDIA_PAUSE', 'MEDIA_NEXT', 'MEDIA_PREVIOUS'],
				prohibitedEffectIds: [],
				requiredExternalEntitlementIds: [],
				contextConstraints: [],
			},
			{
				grantId: 'MOB-GRANT-ADAS-READ',
				capabilityId: 'MOBILITY_READ_ADAS_STATE',
				capabilityVersion: '1',
				purposeIds: ['DRIVER_CONTEXT_EXPLANATION', 'DISTRACTION_REDUCTION'],
				allowedDataClassIds: ['READ_ONLY_ADAS_STATE'],
				prohibitedDataClassIds: [],
				allowedEffectIds: ['VOICE_EXPLANATION_PRESENT', 'MEDIA_DUCK'],
				prohibitedEffectIds: [],
				requiredExternalEntitlementIds: ['OEM_ADAS_READ'],
				contextConstraints: [],
			},
			{
				grantId: 'MOB-GRANT-MIRROR',
				capabilityId: 'DIGITAL_MIRROR_MOBILITY_PROGRESS',
				capabilityVersion: '1',
				purposeIds: ['DIGITAL_MIRROR_MOBILITY_PROGRESSION'],
				allowedDataClassIds: [],
				prohibitedDataClassIds: [],
				allowedEffectIds: ['DIGITAL_MIRROR_CAPABILITY_GRANT'],
				prohibitedEffectIds: [],
				requiredExternalEntitlementIds: [],
				contextConstraints: [],
			},
		],
		effectiveFrom: input.effectiveFrom,
		expiresAt: input.expiresAt,
		status: 'ACTIVE',
		genesisRecordRef: input.genesisRecordRef,
		issuedByRef: input.issuedByRef,
		issuedAt: input.issuedAt ?? input.effectiveFrom,
		wardenPolicyVersion: input.wardenPolicyVersion ?? 'WARDEN-MOBILITY-R0.2',
		riverEvidenceRef: input.riverEvidenceRef,
	}
}
