# Warden Capability License Contract R0.1 — Design Specification

**Contract:** `WARDEN-CAPABILITY-LICENSE-CONTRACT-R0.1`  
**Date:** 2026-09-05  
**Status:** Design frozen for review  
**Scope:** Generic capability-licensing kernel for DigitalMe/Warden domains  
**First consumer:** Warden Mobility / WardenFM R0.2  
**Authority:** Warden remains runtime authority; this contract defines licence envelope only

## 1. Purpose

Create a reusable, machine-readable licensing contract that expresses what a DigitalMe relationship may potentially do, for which purposes, using which data, producing which effects, under which external entitlements, and for how long.

The contract must compile human-readable licence terms into deterministic runtime inputs for Warden without embedding legal prose directly in application logic.

The licence does **not** authorize execution by itself.

```text
Licence = maximum permitted envelope
Warden decision = permission for this request now
Deed = effect actually executed
River = evidence of request, decision, execution, and verified effect
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
11. Denies override allows within the same effective policy scope.
12. Unknown/missing required context fails closed.
13. Every mutable licence object is versioned, effective-dated, revocable, and evidence-linked.
14. Safety-critical capabilities may be globally non-licensable for a domain even when technically reachable.

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

Defines what bounded action or service capability exists.

```ts
export type CapabilityDefinition = {
  capabilityId: string
  version: string
  domain: string
  description: string
  requiredExternalEntitlements: string[]
  allowedPurposeIds: string[]
  allowedInputDataClassIds: string[]
  allowedEffectIds: string[]
  prohibitedEffectIds: string[]
  licensable: boolean
}
```

Examples:

- `WARDENFM_MEDIA_CONTROL`
- `WARDENFM_CONTEXT_MEDIA_ROUTE`
- `WARDEN_VOICE_INTENT`
- `WARDEN_GESTURE_INTENT`
- `MOBILITY_READ_ADAS_STATE`
- `DIGITAL_MIRROR_MOBILITY_PROGRESS`

A capability definition describes the maximum structural envelope. It does not grant the capability to any person or relationship.

### 4.2 Purpose Registry

Purpose is first-class and must be referenced by stable ID rather than free text at runtime.

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

Purpose expansion must be additive and versioned.

### 4.3 Data-Class Registry

Defines classes of data that a capability may consume or emit.

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

Initial Mobility classes:

Allowed examples:

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

Initial Mobility effects:

Licensable:

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

`AUTOLINK_PRIVILEGED_EXECUTION` remains non-licensable; Autolink is probe-only.

## 5. Licence object

A licence binds a principal/relationship to a bounded subset of registry capabilities.

```ts
export type CapabilityLicence = {
  licenceId: string
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
  wardenPolicyVersion: string
  riverEvidenceRef: string
  supersedesLicenceRef?: string
}

export type CapabilityLicenceGrant = {
  capabilityId: string
  capabilityVersion: string
  purposeIds: string[]
  allowedDataClassIds: string[]
  prohibitedDataClassIds: string[]
  allowedEffectIds: string[]
  prohibitedEffectIds: string[]
  requiredExternalEntitlements: string[]
  contextConstraints: Record<string, string | number | boolean | string[]>
  confirmationPolicy?: {
    required: boolean
    admittedFactors: Array<'VOICE_CONFIRMATION' | 'GESTURE_CONFIRMATION' | 'TOUCH_CONFIRMATION'>
  }
}
```

The licence is invalid if `expiresAt <= effectiveFrom`.

## 6. External entitlement model

External entitlement is modeled separately from the Warden licence.

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

Examples:

- Android/AAOS permission or API entitlement;
- Apple/CarPlay entitlement;
- OEM vehicle feature availability;
- music-provider playback/control permission;
- enterprise contract entitlement.

A Warden licence may require one or more external entitlements. Missing or `UNKNOWN` entitlement fails closed for any capability that requires it.

## 7. Admission request

Runtime callers must ask for a specific deed, not a generic licence check.

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

The compiler/evaluator returns a structured result.

```ts
export type CapabilityAdmissionDecision = {
  decision: 'ALLOW' | 'DENY'
  reasonCodes: string[]
  matchedGrantRef?: string
  wardenDecisionRef: string
  policyVersion: string
  evaluatedAt: string
}
```

## 8. Deterministic deny reasons

R0.1 standard reason codes:

- `PRINCIPAL_MISMATCH`
- `RELATIONSHIP_MISMATCH`
- `LICENCE_NOT_ACTIVE`
- `LICENCE_NOT_EFFECTIVE`
- `LICENCE_EXPIRED`
- `LICENCE_REVOKED`
- `CAPABILITY_NOT_LICENSED`
- `CAPABILITY_NOT_LICENSABLE`
- `PURPOSE_NOT_ALLOWED`
- `DATA_CLASS_NOT_ALLOWED`
- `DATA_CLASS_PROHIBITED`
- `EFFECT_NOT_ALLOWED`
- `EFFECT_PROHIBITED`
- `EFFECT_NOT_LICENSABLE`
- `EXTERNAL_ENTITLEMENT_MISSING`
- `EXTERNAL_ENTITLEMENT_INVALID`
- `EXTERNAL_ENTITLEMENT_UNKNOWN`
- `CONTEXT_CONSTRAINT_FAILED`
- `CONFIRMATION_REQUIRED`
- `CONFIRMATION_INVALID`
- `WARDEN_DENIED`

Reason-code output must be stable enough for River evidence, UI explanation, and test assertions.

## 9. Precedence rules

When multiple registry/licence terms apply:

1. Global `licensable: false` overrides every allow.
2. Explicit prohibited effect/data class overrides an allowed list entry.
3. Expiry/revocation overrides all grants.
4. Relationship-specific scope overrides broader domain scope.
5. Missing required external entitlement denies.
6. Missing required purpose/data/effect information denies.
7. A successful licence match still requires Warden runtime allow.

No implicit wildcard exists in R0.1.

## 10. Human-readable DigitalMe Card projection

The DigitalMe Card is a projection of the canonical licence, not the canonical licence itself.

For each capability it may show:

- capability name and current licence state;
- purpose(s);
- permitted data classes;
- prohibited data classes;
- permitted effects;
- relationship/location/device scope;
- effective time and expiry;
- external entitlement dependency;
- latest Warden policy version;
- River evidence link;
- revoke/suspend action where the actor has authority.

The Card must never display a capability as simply “Allowed” when an external entitlement or runtime Warden decision is still required. Preferred states:

- `LICENSED`
- `LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED`
- `AVAILABLE_WARDEN_ADMISSION_REQUIRED`
- `SUSPENDED`
- `REVOKED`
- `EXPIRED`
- `NOT_LICENSED`
- `NON_LICENSABLE`

## 11. Mobility R0.2 profile

The first profile consumes the generic kernel as follows.

### `WARDEN-MOBILITY-CAPABILITY-LICENSE-001`

Recommended grants:

1. `WARDENFM_MEDIA_CONTROL`
   - purposes: `DRIVER_MEDIA_CONTROL`
   - data: no raw cabin media required
   - effects: pause/resume/next/previous

2. `WARDENFM_CONTEXT_MEDIA_ROUTE`
   - purposes: `DRIVER_MEDIA_PERSONALISATION`, `DISTRACTION_REDUCTION`
   - data: traffic state, route complexity, trip phase, read-only ADAS state, media preference
   - effects: profile apply, media duck

3. `WARDEN_VOICE_INTENT`
   - purpose-bound microphone admission required upstream
   - normalized `VOICE_INTENT_TOKEN` only enters the licensing/evidence kernel
   - voice is not identity or authority

4. `WARDEN_GESTURE_INTENT`
   - purpose-bound camera admission required upstream
   - normalized `GESTURE_INTENT_TOKEN` only enters the licensing/evidence kernel
   - gesture may satisfy step-up only when a trusted DigitalMe session and pending request already exist

5. `MOBILITY_READ_ADAS_STATE`
   - read-only
   - external OEM/OS entitlement required
   - no actuation effect IDs

6. `DIGITAL_MIRROR_MOBILITY_PROGRESS`
   - permits scoped capability-progression bookkeeping
   - any resulting capability use still requires its own Warden admission

## 12. Evidence spine

Additive licence/evaluation River event types:

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

## 13. Lifecycle and supersession

Licence mutations are append-only lifecycle changes, not in-place historical rewrites.

```text
DRAFT
→ ACTIVE
→ SUSPENDED ↔ ACTIVE
→ REVOKED

ACTIVE → EXPIRED
```

A materially changed licence is issued as a new version/record and may reference `supersedesLicenceRef`. Prior River evidence remains immutable.

## 14. Separation of duties

### Genesis

- licence identity;
- canonical registry record;
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
- request/decision/effect receipts;
- effect verification.

### Synnergyze

- licence authoring/configuration workflow;
- registry selection;
- operator presentation;
- no final authority.

### DigitalMe Card

- user-facing projection and control surface;
- not canonical authority storage.

## 15. Implementation decomposition

R0.1 implementation should be split into independently testable slices:

1. **Registry contracts** — capability, purpose, data class, effect definitions and validation.
2. **Licence contract** — lifecycle, grant validation, expiry, revocation, supersession references.
3. **External entitlement assertions** — normalized external prerequisite checks.
4. **Deterministic licence evaluator** — pure evaluation of principal/relationship/licence/purpose/data/effect/context/entitlement.
5. **Warden admission adapter** — inject external Warden runtime decision after licence evaluation; never implement Warden authority inside the kernel.
6. **River evidence adapter** — append-only normalized decision/effect evidence.
7. **Mobility profile adapter** — map Warden Mobility R0.2 capabilities/effects to generic registry IDs.
8. **DigitalMe Card projection** — read-only derived state model, not UI implementation in R0.1.

## 16. Acceptance criteria

R0.1 is portable-contract complete only when:

1. Global non-licensable effects cannot be granted by any licence.
2. Principal and relationship mismatches fail closed.
3. Inactive, future, expired, suspended, or revoked licences deny.
4. Purpose is mandatory and must be allowlisted.
5. Input data classes are checked against both allowed and prohibited lists.
6. Requested effects are checked against registry licensability plus licence allow/deny lists.
7. Required external entitlement `UNKNOWN`, missing, or invalid states deny.
8. Context constraints are deterministic and missing required context denies.
9. Licence match alone cannot execute a deed; Warden runtime decision remains mandatory.
10. Deny reason codes are deterministic and evidence-safe.
11. Lifecycle changes are evidence-linked and historical records are not silently rewritten.
12. DigitalMe Card projection distinguishes licensed capability from current executable availability.
13. Mobility profile cannot license steering, braking, throttle, AEB/ACC control, CAN write, ADB execution, or Autolink privileged execution.
14. Voice/gesture remain interaction/confirmation primitives, not identity or standalone authority.
15. The kernel contains no provider credentials, raw camera frames, continuous raw audio, or biometric templates.
16. Warden Mobility R0.2 can consume the kernel without duplicating licence semantics inside mobility application code.

## 17. Explicitly deferred

- jurisdiction-specific legal drafting;
- consumer contract text/terms presentation;
- regulatory classification by country;
- billing/settlement entitlements;
- SILK commercial settlement integration;
- cryptographic licence signing format;
- distributed federation between multiple sovereign Wardens;
- native DigitalMe Card UI;
- safety-critical vehicle actuation licensing;
- wildcard grants.

These may be added in later versions without weakening R0.1 deny precedence or separation of duties.

## 18. Release posture

Until runtime integration and formal repository verification are complete, use:

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
