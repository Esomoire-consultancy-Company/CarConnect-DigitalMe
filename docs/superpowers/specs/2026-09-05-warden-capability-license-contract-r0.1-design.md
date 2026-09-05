# Warden Capability License Contract R0.1 — Design Specification

**Contract:** `WARDEN-CAPABILITY-LICENSE-CONTRACT-R0.1`  
**Date:** 2026-09-05  
**Status:** Design frozen for review  
**Scope:** Generic capability-licensing kernel for DigitalMe/Warden domains  
**First consumer:** Warden Mobility / WardenFM R0.2  
**Authority:** Warden remains runtime authority; this contract defines licence envelope only

## 1. Purpose

Create a reusable, machine-readable licensing contract that expresses what a DigitalMe relationship may potentially do, for which purposes, using which data, producing which effects, under which external entitlements, and for how long.

The contract compiles human-readable licence terms into deterministic runtime inputs for Warden without embedding legal prose directly in application logic.

The licence does **not** authorize execution by itself.

```text
Licence = maximum permitted envelope
Licence evaluation = deterministic envelope match/deny
Warden decision = permission for this request now
Deed = effect actually executed
River = evidence of request, evaluation, decision, execution, and verified effect
```

## 2. Core invariants

1. `DigitalMe` is the principal.
2. `Warden` is the runtime authorization and consent controller.
3. `Genesis` is the canonical registry/lifecycle authority for licence identity, version, relationships, and supersession.
4. `River` is the evidence plane.
5. `Synnergyze` may configure/orchestrate licences but does not become authority.
6. A licence never creates an OS, OEM, provider, legal, regulatory, or contractual entitlement that does not already exist.
7. Technical availability never equals authorization.
8. User consent never substitutes for platform entitlement where platform entitlement is separately required.
9. Platform entitlement never substitutes for Warden authorization.
10. Execution requires every applicable gate to pass.
11. Global non-licensable definitions and explicit denies override allows.
12. Unknown or missing required context fails closed.
13. Every licence is versioned, effective-dated, revocable, and evidence-linked.
14. Safety-critical capabilities may be globally non-licensable for a domain even when technically reachable.
15. No implicit wildcard grant exists in R0.1.

## 3. Runtime decision equation

For an effect request `R`:

```text
EXECUTE(R) =
  PRINCIPAL_VALID
  ∧ RELATIONSHIP_VALID
  ∧ EXTERNAL_ENTITLEMENT_VALID
  ∧ LICENCE_MATCHES
  ∧ PURPOSE_ALLOWED
  ∧ DATA_USE_ALLOWED
  ∧ EFFECT_ALLOWED
  ∧ CONTEXT_CONSTRAINTS_SATISFIED
  ∧ LICENCE_EFFECTIVE
  ∧ NOT_REVOKED
  ∧ WARDEN_DECISION_ALLOW
```

If any required term is false or unknown, execution is denied.

## 4. Registry model

R0.1 defines four primary registries plus the compiled licence object.

### 4.1 Capability Registry

```ts
export type CapabilityDefinition = {
  capabilityId: string
  version: string
  domain: string
  description: string
  requiredExternalEntitlementIds: string[]
  allowedPurposeIds: string[]
  allowedInputDataClassIds: string[]
  allowedEffectIds: string[]
  prohibitedEffectIds: string[]
  licensable: boolean
}
```

Initial Mobility examples:

- `WARDENFM_MEDIA_CONTROL`
- `WARDENFM_CONTEXT_MEDIA_ROUTE`
- `WARDEN_VOICE_INTENT`
- `WARDEN_GESTURE_INTENT`
- `MOBILITY_READ_ADAS_STATE`
- `DIGITAL_MIRROR_MOBILITY_PROGRESS`

A capability definition describes the maximum structural envelope. It grants nothing to a person or relationship by itself.

### 4.2 Purpose Registry

Purpose is first-class and referenced by stable ID, not free text, at runtime.

```ts
export type PurposeDefinition = {
  purposeId: string
  version: string
  domain: string
  description: string
  compatibleCapabilityIds: string[]
  retentionClass?: string
}
```

Initial Mobility purpose IDs:

- `DRIVER_MEDIA_CONTROL`
- `DRIVER_MEDIA_PERSONALISATION`
- `DISTRACTION_REDUCTION`
- `DRIVER_CONTEXT_EXPLANATION`
- `MOBILITY_STEP_UP_CONFIRMATION`
- `DIGITAL_MIRROR_MOBILITY_PROGRESSION`

### 4.3 Data-Class Registry

```ts
export type DataClassDefinition = {
  dataClassId: string
  version: string
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'PERSONAL' | 'SENSITIVE' | 'RESTRICTED'
  retentionDefault: 'NONE' | 'TRANSIENT' | 'SESSION' | 'EVIDENCE_BOUNDED'
  rawMedia: boolean
  biometric: boolean
  secret: boolean
}
```

Initial Mobility allowed examples:

- `TRAFFIC_STATE`
- `ROUTE_COMPLEXITY`
- `TRIP_PHASE`
- `READ_ONLY_ADAS_STATE`
- `MEDIA_PREFERENCE`
- `VOICE_INTENT_TOKEN`
- `GESTURE_INTENT_TOKEN`

Restricted/non-admitted examples for Mobility R0.2:

- `RAW_CABIN_VIDEO`
- `CONTINUOUS_RAW_AUDIO`
- `VOICEPRINT_TEMPLATE`
- `FACE_BIOMETRIC_TEMPLATE`
- `HAND_BIOMETRIC_TEMPLATE`
- `PROVIDER_SECRET`
- `ACCESS_TOKEN_SECRET`

### 4.4 Effect Registry

Effects represent observable consequences, not implementation methods.

```ts
export type EffectDefinition = {
  effectId: string
  version: string
  domain: string
  description: string
  safetyClass: 'NON_SAFETY' | 'SAFETY_RELATED' | 'SAFETY_CRITICAL'
  licensable: boolean
  requiresEffectVerification: boolean
}
```

Initial Mobility licensable effects:

- `MEDIA_PAUSE`
- `MEDIA_RESUME`
- `MEDIA_NEXT`
- `MEDIA_PREVIOUS`
- `MEDIA_DUCK`
- `MEDIA_PROFILE_APPLY`
- `VOICE_EXPLANATION_PRESENT`
- `DIGITAL_MIRROR_CAPABILITY_GRANT`

Globally non-licensable in Mobility R0.1/R0.2:

- `VEHICLE_STEER`
- `VEHICLE_BRAKE`
- `VEHICLE_THROTTLE`
- `VEHICLE_AEB_CONTROL`
- `VEHICLE_ACC_CONTROL`
- `VEHICLE_CAN_WRITE`
- `ADB_EXECUTION`
- `AUTOLINK_PRIVILEGED_EXECUTION`

Autolink remains probe-only.

## 5. Deterministic context-constraint grammar

R0.1 does not accept arbitrary executable policy expressions. Grants use a bounded declarative grammar.

```ts
export type ContextConstraint = {
  key: string
  operator: 'EQ' | 'NEQ' | 'IN' | 'NOT_IN' | 'GTE' | 'LTE' | 'EXISTS'
  value?: string | number | boolean | string[]
  required: boolean
}
```

Rules:

- `EXISTS` ignores `value`.
- `IN` and `NOT_IN` require `string[]`.
- `GTE` and `LTE` require numeric request context.
- A required constraint with a missing context key denies.
- Unsupported operators or incompatible value types invalidate the licence at compile/validation time.
- No arbitrary code, regex execution, script, or dynamic expression evaluation exists in R0.1.

## 6. Licence object

```ts
export type CapabilityLicence = {
  licenceId: string
  licenceVersion: string
  schemaVersion: 'R0.1'
  holder: {
    principalType: 'DigitalMe'
    principalRef: string
  }
  relationship: {
    relationshipType: string
    relationshipRef: string
    locationRef?: string
    deviceRef?: string
  }
  grants: CapabilityLicenceGrant[]
  effectiveFrom: string
  expiresAt: string
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'
  genesisRecordRef: string
  issuedByRef: string
  issuedAt: string
  wardenPolicyVersion: string
  riverEvidenceRef: string
  supersedesLicenceRef?: string
}

export type CapabilityLicenceGrant = {
  grantId: string
  capabilityId: string
  capabilityVersion: string
  purposeIds: string[]
  allowedDataClassIds: string[]
  prohibitedDataClassIds: string[]
  allowedEffectIds: string[]
  prohibitedEffectIds: string[]
  requiredExternalEntitlementIds: string[]
  contextConstraints: ContextConstraint[]
  confirmationPolicy?: {
    required: boolean
    admittedFactors: Array<'VOICE_CONFIRMATION' | 'GESTURE_CONFIRMATION' | 'TOUCH_CONFIRMATION'>
  }
}
```

Validation requirements:

- `expiresAt > effectiveFrom`;
- every `grantId` is unique within the licence;
- every referenced registry ID/version exists;
- a grant cannot include a globally non-licensable capability or effect;
- an item present in both allow and prohibit lists is treated as prohibited and should be rejected at compile time as contradictory;
- the licence cannot broaden the referenced Capability Registry definition.

## 7. External entitlement model

External entitlement is separate from the Warden licence.

```ts
export type ExternalEntitlementAssertion = {
  entitlementId: string
  provider: string
  subjectRef: string
  capabilityId: string
  status: 'VALID' | 'INVALID' | 'UNKNOWN'
  observedAt: string
  expiresAt?: string
  evidenceRef: string
}
```

Examples include Android/AAOS permissions, Apple/CarPlay entitlements, OEM feature availability, music-provider rights, or enterprise contract entitlements.

A required entitlement denies when missing, `INVALID`, `UNKNOWN`, or expired at request time.

## 8. Admission request

Runtime callers ask for a specific deed, not a generic licence check.

```ts
export type CapabilityAdmissionRequest = {
  requestId: string
  digitalMeSessionRef: string
  principalRef: string
  relationshipRef: string
  licenceRef: string
  capabilityId: string
  purposeId: string
  requestedEffectId: string
  inputDataClassIds: string[]
  externalEntitlementRefs: string[]
  context: Record<string, string | number | boolean | string[]>
  confirmationRef?: string
  requestedAt: string
}
```

## 9. Two-stage decision model

Licence evaluation and Warden authorization are deliberately separate.

### Stage A — pure licence evaluation

```ts
export type LicenceEvaluationResult = {
  decision: 'MATCH' | 'DENY'
  reasonCodes: LicenceReasonCode[]
  matchedGrantRef?: string
  licenceRef: string
  licenceVersion: string
  evaluatedAt: string
}
```

A `MATCH` means only that the request fits the maximum licence envelope.

### Stage B — external Warden runtime decision

```ts
export type WardenCapabilityDecision = {
  decision: 'ALLOW' | 'DENY'
  reasonCodes: string[]
  licenceEvaluationRef: string
  wardenDecisionRef: string
  policyVersion: string
  evaluatedAt: string
}
```

The kernel exposes an interface/port to Warden; it does not implement Warden authority internally.

A deed may execute only when Stage A returns `MATCH` and Stage B returns `ALLOW`.

## 10. Deterministic licence reason codes

```ts
export type LicenceReasonCode =
  | 'PRINCIPAL_MISMATCH'
  | 'RELATIONSHIP_MISMATCH'
  | 'LICENCE_NOT_ACTIVE'
  | 'LICENCE_NOT_EFFECTIVE'
  | 'LICENCE_EXPIRED'
  | 'LICENCE_REVOKED'
  | 'CAPABILITY_NOT_LICENSED'
  | 'CAPABILITY_NOT_LICENSABLE'
  | 'PURPOSE_NOT_ALLOWED'
  | 'DATA_CLASS_NOT_ALLOWED'
  | 'DATA_CLASS_PROHIBITED'
  | 'EFFECT_NOT_ALLOWED'
  | 'EFFECT_PROHIBITED'
  | 'EFFECT_NOT_LICENSABLE'
  | 'EXTERNAL_ENTITLEMENT_MISSING'
  | 'EXTERNAL_ENTITLEMENT_INVALID'
  | 'EXTERNAL_ENTITLEMENT_UNKNOWN'
  | 'EXTERNAL_ENTITLEMENT_EXPIRED'
  | 'CONTEXT_REQUIRED_MISSING'
  | 'CONTEXT_CONSTRAINT_FAILED'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_INVALID'
```

Warden may add its own decision reason codes after licence matching, including `WARDEN_DENIED`.

## 11. Precedence rules

1. Registry `licensable: false` overrides every allow.
2. Explicit prohibited effect/data class overrides an allowed entry.
3. Revoked, suspended, expired, future, or otherwise inactive licence state denies all grants.
4. The request principal and relationship must exactly match the licence binding in R0.1.
5. Missing/unknown/invalid/expired required external entitlement denies.
6. Missing required purpose/data/effect/context information denies.
7. A successful licence match still requires Warden runtime allow.
8. No implicit domain-wide, organization-wide, or wildcard inheritance exists in R0.1.

## 12. DigitalMe Card projection

The DigitalMe Card is a projection of canonical Genesis licence state, not authority storage.

For each capability it may show:

- capability and licence version;
- current licence lifecycle state;
- purposes;
- permitted/prohibited data classes;
- permitted/prohibited effects;
- relationship/location/device scope;
- effective time and expiry;
- external entitlement dependency;
- Warden policy version;
- River evidence reference;
- revoke/suspend action where the actor has authority.

The Card must distinguish licence-envelope status from current runtime executability. Preferred states:

- `LICENSED_ENVELOPE`
- `LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED`
- `AVAILABLE_WARDEN_ADMISSION_REQUIRED`
- `SUSPENDED`
- `REVOKED`
- `EXPIRED`
- `NOT_LICENSED`
- `NON_LICENSABLE`

It must never imply that `LICENSED_ENVELOPE` means “may execute now.”

## 13. Mobility R0.2 profile

### `WARDEN-MOBILITY-CAPABILITY-LICENSE-001`

Recommended grants:

1. `WARDENFM_MEDIA_CONTROL`
   - purpose: `DRIVER_MEDIA_CONTROL`
   - effects: pause/resume/next/previous

2. `WARDENFM_CONTEXT_MEDIA_ROUTE`
   - purposes: `DRIVER_MEDIA_PERSONALISATION`, `DISTRACTION_REDUCTION`
   - data: traffic state, route complexity, trip phase, read-only ADAS state, media preference
   - effects: profile apply, media duck

3. `WARDEN_VOICE_INTENT`
   - purpose-bound microphone admission required upstream
   - only normalized `VOICE_INTENT_TOKEN` enters the licensing/evidence kernel
   - voice is not identity or authority

4. `WARDEN_GESTURE_INTENT`
   - purpose-bound camera admission required upstream
   - only normalized `GESTURE_INTENT_TOKEN` enters the licensing/evidence kernel
   - gesture may satisfy step-up only when a trusted DigitalMe session and pending request already exist

5. `MOBILITY_READ_ADAS_STATE`
   - read-only
   - external OEM/OS entitlement required
   - no actuation effect IDs

6. `DIGITAL_MIRROR_MOBILITY_PROGRESS`
   - permits scoped capability-progression bookkeeping
   - resulting capability use still requires its own licence match and Warden admission

## 14. Evidence spine

Additive River event types:

- `CAPABILITY_LICENCE_ISSUED`
- `CAPABILITY_LICENCE_ACTIVATED`
- `CAPABILITY_LICENCE_SUSPENDED`
- `CAPABILITY_LICENCE_REVOKED`
- `CAPABILITY_LICENCE_EXPIRED`
- `CAPABILITY_ADMISSION_REQUESTED`
- `EXTERNAL_ENTITLEMENT_EVALUATED`
- `CAPABILITY_LICENCE_MATCH_EVALUATED`
- `WARDEN_CAPABILITY_DECISION_RECORDED`
- `CAPABILITY_DEED_EXECUTED`
- `CAPABILITY_EFFECT_VERIFIED`

Evidence payloads contain IDs, versions, normalized classes, reason codes, decision refs, and effect outcomes. They must not contain provider secrets, raw cabin media, biometric templates, or unrestricted third-party content.

## 15. Lifecycle and supersession

Licence lifecycle:

```text
DRAFT
→ ACTIVE
→ SUSPENDED ↔ ACTIVE
→ REVOKED

ACTIVE → EXPIRED
```

Lifecycle changes are recorded as new evidence-bearing transitions, not historical rewrites. A materially changed licence is issued as a new `licenceVersion`/record and references `supersedesLicenceRef` where applicable. Prior River evidence remains immutable.

## 16. Separation of duties

### Genesis

- licence identity and canonical record;
- version/effective date/supersession;
- DigitalMe relationship binding.

### Warden

- runtime policy evaluation;
- consent and purpose enforcement;
- context-sensitive allow/deny;
- step-up requirement;
- revocation enforcement.

### River

- lifecycle evidence;
- request/evaluation/decision/effect receipts;
- effect verification.

### Synnergyze

- licence authoring/configuration workflow;
- registry selection;
- operator presentation;
- no final authority.

### DigitalMe Card

- user-facing projection and control surface;
- not canonical authority storage.

## 17. Implementation decomposition

R0.1 implementation should be split into independently testable slices:

1. **Registry contracts** — capability, purpose, data class, effect definitions and validation.
2. **Licence contract** — grant IDs, lifecycle, expiry, revocation, supersession, contradiction checks.
3. **Context-constraint evaluator** — bounded operator grammar only.
4. **External entitlement assertions** — normalized external prerequisite checks.
5. **Deterministic licence evaluator** — principal/relationship/licence/purpose/data/effect/context/entitlement.
6. **Warden admission port** — inject external Warden runtime decision after licence evaluation.
7. **River evidence adapter** — append-only normalized lifecycle/evaluation/decision/effect evidence.
8. **Mobility profile adapter** — map Warden Mobility R0.2 capability/effect vocabulary to generic registry IDs.
9. **DigitalMe Card projection** — read-only derived state model; no UI implementation required in R0.1.

## 18. Acceptance criteria

R0.1 is portable-contract complete only when:

1. Global non-licensable effects/capabilities cannot be granted by any licence.
2. Principal and relationship mismatches fail closed.
3. Draft, future, suspended, expired, or revoked licences deny.
4. Purpose is mandatory and allowlisted.
5. Input data classes are checked against both registry and licence allow/prohibit rules.
6. Requested effects are checked against registry licensability and licence allow/prohibit rules.
7. Required external entitlement missing, `UNKNOWN`, invalid, or expired denies.
8. Context constraints use only the bounded grammar; missing required context denies.
9. Licence match cannot execute a deed; external Warden runtime allow remains mandatory.
10. Licence reason codes are deterministic and evidence-safe.
11. Lifecycle changes and supersession are evidence-linked; historical records are not silently rewritten.
12. DigitalMe Card projection distinguishes licence envelope from current executable availability.
13. Mobility profile cannot license steering, braking, throttle, AEB/ACC control, CAN write, ADB execution, or Autolink privileged execution.
14. Voice/gesture remain interaction/confirmation primitives, not identity or standalone authority.
15. The kernel contains no provider credentials, raw camera frames, continuous raw audio, or biometric templates.
16. Warden Mobility R0.2 can consume the kernel without duplicating licence semantics inside mobility application code.
17. Every matched grant has a stable `grantId` that can be referenced by River evidence.
18. External entitlement and Warden decision evidence are separable from licence-match evidence.

## 19. Explicitly deferred

- jurisdiction-specific legal drafting;
- consumer contract/terms presentation;
- regulatory classification by country;
- billing/settlement entitlements;
- SILK settlement integration;
- cryptographic licence signing format;
- federation between sovereign Wardens;
- native DigitalMe Card UI;
- safety-critical vehicle actuation licensing;
- wildcard or inherited grants.

These may be added later without weakening R0.1 deny precedence or separation of duties.

## 20. Release posture

```text
Contract state: DESIGN_FROZEN / PORTABLE_IMPLEMENTATION_PENDING
Authority: WARDEN_EXTERNAL
Registry authority: GENESIS
Evidence: RIVER
Operator: SYNNERGYZE_NO_AUTHORITY
First profile: WARDEN_MOBILITY
Safety-critical vehicle actuation: NON_LICENSABLE
ADB execution: NON_LICENSABLE / HARD_DENIED
Autolink privileged execution: NON_LICENSABLE / PROBE_ONLY
```
