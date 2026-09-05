# Warden Capability License Contract R0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable, deterministic capability-licensing kernel that validates registry definitions and DigitalMe relationship licences, evaluates bounded requests against licence/entitlement/context constraints, delegates the final runtime decision to external Warden authority, records River-compatible evidence, and exposes Mobility and DigitalMe Card projections without duplicating policy semantics.

**Architecture:** Add a domain-neutral `src/warden/capability-license/` package. The kernel stops at a pure `MATCH`/`DENY` licence-envelope evaluation; an injected Warden port performs the later runtime `ALLOW`/`DENY`, and deed execution remains outside the kernel. Mobility R0.2 is only an adapter/profile consumer of this package.

**Tech Stack:** TypeScript 5.9.x, Jest 30.x, React Native repository toolchain, no new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-05-warden-capability-license-contract-r0.1-design.md`

## Global Constraints

- DigitalMe is the principal.
- Warden remains external runtime authority; the licence kernel never self-authorizes execution.
- Genesis remains canonical registry/lifecycle authority for licence identity/version/relationship/supersession.
- River remains evidence plane.
- Synnergyze may configure/orchestrate but has no final authority.
- A licence never creates OS/OEM/provider/legal/regulatory/contractual entitlement.
- Technical availability never equals authorization.
- User consent does not substitute for separately required platform entitlement.
- Platform entitlement does not substitute for Warden authorization.
- Any missing required gate fails closed.
- Registry `licensable: false` overrides every allow.
- Explicit prohibit rules override allow rules.
- No implicit wildcard or inherited grants exist in R0.1.
- Context constraints use only `EQ`, `NEQ`, `IN`, `NOT_IN`, `GTE`, `LTE`, `EXISTS`.
- No arbitrary code, regex policy execution, scripts, or dynamic expression evaluation.
- Voice/gesture remain interaction or confirmation primitives, not identity or standalone authority.
- Safety-critical vehicle actuation, ADB execution, and Autolink privileged execution remain non-licensable.
- No provider credentials, raw camera frames, continuous raw audio, or biometric templates are stored in the kernel/evidence payloads.

---

## File Map

```text
src/warden/capability-license/
├── registry.ts
├── licence.ts
├── constraints.ts
├── entitlement.ts
├── evaluator.ts
├── warden.ts
├── evidence.ts
├── mobility-profile.ts
├── digitalme-card.ts
└── index.ts

src/warden/capability-license/__tests__/
├── registry.test.ts
├── licence.test.ts
├── constraints.test.ts
├── entitlement.test.ts
├── evaluator.test.ts
├── warden.test.ts
├── evidence.test.ts
├── mobility-profile.test.ts
└── digitalme-card.test.ts
```

---

### Task 1: Registry Contracts and Global Non-Licensable Enforcement

**Files:**
- Create: `src/warden/capability-license/registry.ts`
- Test: `src/warden/capability-license/__tests__/registry.test.ts`

**Interfaces:**
- Produces: `CapabilityDefinition`, `PurposeDefinition`, `DataClassDefinition`, `EffectDefinition`, `CapabilityLicenseRegistry`, `validateRegistry()`
- Consumes: nothing from later tasks

- [ ] **Step 1: Write failing tests**

```ts
import { validateRegistry, type CapabilityLicenseRegistry } from '../registry'

const registry = (): CapabilityLicenseRegistry => ({
  capabilities: [{
    capabilityId: 'SAFE_MEDIA', version: '1', domain: 'mobility', description: 'media',
    requiredExternalEntitlementIds: [], allowedPurposeIds: ['P1'],
    allowedInputDataClassIds: ['D1'], allowedEffectIds: ['E1'], prohibitedEffectIds: [], licensable: true,
  }],
  purposes: [{ purposeId: 'P1', version: '1', domain: 'mobility', description: 'purpose', compatibleCapabilityIds: ['SAFE_MEDIA'] }],
  dataClasses: [{ dataClassId: 'D1', version: '1', sensitivity: 'PERSONAL', retentionDefault: 'TRANSIENT', rawMedia: false, biometric: false, secret: false }],
  effects: [
    { effectId: 'E1', version: '1', domain: 'mobility', description: 'pause', safetyClass: 'NON_SAFETY', licensable: true, requiresEffectVerification: true },
    { effectId: 'VEHICLE_STEER', version: '1', domain: 'mobility', description: 'steer', safetyClass: 'SAFETY_CRITICAL', licensable: false, requiresEffectVerification: true },
  ],
})

describe('capability license registry', () => {
  it('accepts a coherent registry', () => expect(validateRegistry(registry())).toEqual([]))

  it('rejects a capability that structurally allows a non-licensable effect', () => {
    const input = registry()
    input.capabilities[0].allowedEffectIds.push('VEHICLE_STEER')
    expect(validateRegistry(input)).toContain('CAPABILITY_ALLOWS_NON_LICENSABLE_EFFECT:SAFE_MEDIA:VEHICLE_STEER')
  })

  it('rejects unresolved references', () => {
    const input = registry()
    input.capabilities[0].allowedPurposeIds = ['MISSING']
    expect(validateRegistry(input)).toContain('UNKNOWN_PURPOSE:SAFE_MEDIA:MISSING')
  })
})
```

- [ ] **Step 2: Run RED**

```bash
bunx jest src/warden/capability-license/__tests__/registry.test.ts --runInBand
```

Expected: FAIL because `registry.ts` does not exist.

- [ ] **Step 3: Implement registry contracts and validation**

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

export type PurposeDefinition = {
  purposeId: string
  version: string
  domain: string
  description: string
  compatibleCapabilityIds: string[]
  retentionClass?: string
}

export type DataClassDefinition = {
  dataClassId: string
  version: string
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'PERSONAL' | 'SENSITIVE' | 'RESTRICTED'
  retentionDefault: 'NONE' | 'TRANSIENT' | 'SESSION' | 'EVIDENCE_BOUNDED'
  rawMedia: boolean
  biometric: boolean
  secret: boolean
}

export type EffectDefinition = {
  effectId: string
  version: string
  domain: string
  description: string
  safetyClass: 'NON_SAFETY' | 'SAFETY_RELATED' | 'SAFETY_CRITICAL'
  licensable: boolean
  requiresEffectVerification: boolean
}

export type CapabilityLicenseRegistry = {
  capabilities: CapabilityDefinition[]
  purposes: PurposeDefinition[]
  dataClasses: DataClassDefinition[]
  effects: EffectDefinition[]
}

export function validateRegistry(registry: CapabilityLicenseRegistry): string[] {
  const errors: string[] = []
  const purposes = new Set(registry.purposes.map((x) => x.purposeId))
  const data = new Set(registry.dataClasses.map((x) => x.dataClassId))
  const effects = new Map(registry.effects.map((x) => [x.effectId, x]))

  for (const capability of registry.capabilities) {
    for (const purposeId of capability.allowedPurposeIds) {
      if (!purposes.has(purposeId)) errors.push(`UNKNOWN_PURPOSE:${capability.capabilityId}:${purposeId}`)
    }
    for (const dataClassId of capability.allowedInputDataClassIds) {
      if (!data.has(dataClassId)) errors.push(`UNKNOWN_DATA_CLASS:${capability.capabilityId}:${dataClassId}`)
    }
    for (const effectId of capability.allowedEffectIds) {
      const effect = effects.get(effectId)
      if (!effect) errors.push(`UNKNOWN_EFFECT:${capability.capabilityId}:${effectId}`)
      else if (!effect.licensable) errors.push(`CAPABILITY_ALLOWS_NON_LICENSABLE_EFFECT:${capability.capabilityId}:${effectId}`)
    }
  }
  return errors
}
```

- [ ] **Step 4: Run tests**

```bash
bunx jest src/warden/capability-license/__tests__/registry.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/warden/capability-license/registry.ts src/warden/capability-license/__tests__/registry.test.ts
git commit -m "feat: add capability license registry contracts"
```

---

### Task 2: Licence Contract Validation, Lifecycle, Contradiction Checks

**Files:**
- Create: `src/warden/capability-license/licence.ts`
- Test: `src/warden/capability-license/__tests__/licence.test.ts`

**Interfaces:**
- Consumes: `CapabilityLicenseRegistry`
- Produces: `CapabilityLicence`, `CapabilityLicenceGrant`, `ContextConstraint`, `validateCapabilityLicence()`

- [ ] **Step 1: Write failing tests for non-licensable grants, duplicate IDs, contradictions, and dates**

```ts
import { validateCapabilityLicence, type CapabilityLicence } from '../licence'
import type { CapabilityLicenseRegistry } from '../registry'

const licence = (): CapabilityLicence => ({
  licenceId: 'L1', licenceVersion: '1', schemaVersion: 'R0.1',
  holder: { principalType: 'DigitalMe', principalRef: 'DM1' },
  relationship: { relationshipType: 'vehicle', relationshipRef: 'VR1' },
  grants: [{
    grantId: 'G1', capabilityId: 'SAFE_MEDIA', capabilityVersion: '1', purposeIds: ['P1'],
    allowedDataClassIds: ['D1'], prohibitedDataClassIds: [], allowedEffectIds: ['E1'], prohibitedEffectIds: [],
    requiredExternalEntitlementIds: [], contextConstraints: [],
  }],
  effectiveFrom: '2026-09-05T00:00:00.000Z', expiresAt: '2026-09-06T00:00:00.000Z', status: 'ACTIVE',
  genesisRecordRef: 'GEN-1', issuedByRef: 'ISSUER-1', issuedAt: '2026-09-05T00:00:00.000Z',
  wardenPolicyVersion: 'W1', riverEvidenceRef: 'R1',
})

it('rejects duplicate grant IDs', () => {
  const value = licence(); value.grants.push({ ...value.grants[0] })
  expect(validateCapabilityLicence(value, testRegistry())).toContain('DUPLICATE_GRANT_ID:G1')
})

it('rejects allow/prohibit contradictions', () => {
  const value = licence(); value.grants[0].prohibitedEffectIds = ['E1']
  expect(validateCapabilityLicence(value, testRegistry())).toContain('CONTRADICTORY_EFFECT:G1:E1')
})

it('rejects expired-before-effective licences', () => {
  const value = licence(); value.expiresAt = value.effectiveFrom
  expect(validateCapabilityLicence(value, testRegistry())).toContain('INVALID_LICENCE_TIME_RANGE')
})
```

`testRegistry()` must include the coherent Task 1 registry and remain local to the test file.

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/licence.test.ts --runInBand
```

- [ ] **Step 3: Implement licence types and deterministic validation**

```ts
import type { CapabilityLicenseRegistry } from './registry'

export type ContextConstraint = {
  key: string
  operator: 'EQ' | 'NEQ' | 'IN' | 'NOT_IN' | 'GTE' | 'LTE' | 'EXISTS'
  value?: string | number | boolean | string[]
  required: boolean
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

export type CapabilityLicence = {
  licenceId: string
  licenceVersion: string
  schemaVersion: 'R0.1'
  holder: { principalType: 'DigitalMe'; principalRef: string }
  relationship: { relationshipType: string; relationshipRef: string; locationRef?: string; deviceRef?: string }
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

export function validateCapabilityLicence(value: CapabilityLicence, registry: CapabilityLicenseRegistry): string[] {
  const errors: string[] = []
  if (Date.parse(value.expiresAt) <= Date.parse(value.effectiveFrom)) errors.push('INVALID_LICENCE_TIME_RANGE')
  const seen = new Set<string>()
  const capabilities = new Map(registry.capabilities.map((x) => [x.capabilityId, x]))
  const effects = new Map(registry.effects.map((x) => [x.effectId, x]))

  for (const grant of value.grants) {
    if (seen.has(grant.grantId)) errors.push(`DUPLICATE_GRANT_ID:${grant.grantId}`)
    seen.add(grant.grantId)
    const capability = capabilities.get(grant.capabilityId)
    if (!capability || !capability.licensable) errors.push(`NON_LICENSABLE_CAPABILITY:${grant.grantId}:${grant.capabilityId}`)
    for (const effectId of grant.allowedEffectIds) {
      if (grant.prohibitedEffectIds.includes(effectId)) errors.push(`CONTRADICTORY_EFFECT:${grant.grantId}:${effectId}`)
      const effect = effects.get(effectId)
      if (!effect || !effect.licensable) errors.push(`NON_LICENSABLE_EFFECT:${grant.grantId}:${effectId}`)
      if (capability && !capability.allowedEffectIds.includes(effectId)) errors.push(`GRANT_BROADENS_CAPABILITY_EFFECT:${grant.grantId}:${effectId}`)
    }
    for (const dataClassId of grant.allowedDataClassIds) {
      if (grant.prohibitedDataClassIds.includes(dataClassId)) errors.push(`CONTRADICTORY_DATA_CLASS:${grant.grantId}:${dataClassId}`)
      if (capability && !capability.allowedInputDataClassIds.includes(dataClassId)) errors.push(`GRANT_BROADENS_CAPABILITY_DATA:${grant.grantId}:${dataClassId}`)
    }
  }
  return errors
}
```

- [ ] **Step 4: Run Task 2 and Task 1 tests**

```bash
bunx jest src/warden/capability-license/__tests__/registry.test.ts src/warden/capability-license/__tests__/licence.test.ts --runInBand
```

- [ ] **Step 5: Commit**

```bash
git add src/warden/capability-license/licence.ts src/warden/capability-license/__tests__/licence.test.ts
git commit -m "feat: add capability licence contract validation"
```

---

### Task 3: Bounded Context Constraint Evaluator

**Files:**
- Create: `src/warden/capability-license/constraints.ts`
- Test: `src/warden/capability-license/__tests__/constraints.test.ts`

**Interfaces:**
- Consumes: `ContextConstraint`
- Produces: `validateContextConstraint()`, `evaluateContextConstraints()`

- [ ] **Step 1: Write failing tests for each operator and fail-closed missing context**

```ts
import { evaluateContextConstraints, validateContextConstraint } from '../constraints'

it('fails required missing context', () => {
  expect(evaluateContextConstraints([{ key: 'vehicleRef', operator: 'EXISTS', required: true }], {}))
    .toEqual({ matched: false, reason: 'CONTEXT_REQUIRED_MISSING' })
})

it('evaluates bounded numeric and membership operators', () => {
  expect(evaluateContextConstraints([
    { key: 'speed', operator: 'LTE', value: 5, required: true },
    { key: 'mode', operator: 'IN', value: ['PARKED', 'IDLE'], required: true },
  ], { speed: 0, mode: 'PARKED' }).matched).toBe(true)
})

it('rejects invalid operator/value combinations at validation time', () => {
  expect(validateContextConstraint({ key: 'mode', operator: 'IN', value: 'PARKED', required: true }))
    .toContain('IN_REQUIRES_STRING_ARRAY')
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/constraints.test.ts --runInBand
```

- [ ] **Step 3: Implement explicit switch-based evaluation**

```ts
import type { ContextConstraint } from './licence'

export type RequestContext = Record<string, string | number | boolean | string[]>

export function validateContextConstraint(c: ContextConstraint): string[] {
  if ((c.operator === 'IN' || c.operator === 'NOT_IN') && !Array.isArray(c.value)) return ['IN_REQUIRES_STRING_ARRAY']
  if ((c.operator === 'GTE' || c.operator === 'LTE') && typeof c.value !== 'number') return ['NUMERIC_OPERATOR_REQUIRES_NUMBER']
  return []
}

export function evaluateContextConstraints(
  constraints: ContextConstraint[], context: RequestContext,
): { matched: boolean; reason?: 'CONTEXT_REQUIRED_MISSING' | 'CONTEXT_CONSTRAINT_FAILED' } {
  for (const c of constraints) {
    const exists = Object.prototype.hasOwnProperty.call(context, c.key)
    if (!exists && c.required) return { matched: false, reason: 'CONTEXT_REQUIRED_MISSING' }
    if (!exists) continue
    const actual = context[c.key]
    let ok = false
    switch (c.operator) {
      case 'EXISTS': ok = true; break
      case 'EQ': ok = actual === c.value; break
      case 'NEQ': ok = actual !== c.value; break
      case 'IN': ok = typeof actual === 'string' && Array.isArray(c.value) && c.value.includes(actual); break
      case 'NOT_IN': ok = typeof actual === 'string' && Array.isArray(c.value) && !c.value.includes(actual); break
      case 'GTE': ok = typeof actual === 'number' && typeof c.value === 'number' && actual >= c.value; break
      case 'LTE': ok = typeof actual === 'number' && typeof c.value === 'number' && actual <= c.value; break
    }
    if (!ok) return { matched: false, reason: 'CONTEXT_CONSTRAINT_FAILED' }
  }
  return { matched: true }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
bunx jest src/warden/capability-license/__tests__/constraints.test.ts --runInBand
git add src/warden/capability-license/constraints.ts src/warden/capability-license/__tests__/constraints.test.ts
git commit -m "feat: add bounded licence context constraints"
```

---

### Task 4: External Entitlement Assertions

**Files:**
- Create: `src/warden/capability-license/entitlement.ts`
- Test: `src/warden/capability-license/__tests__/entitlement.test.ts`

**Interfaces:**
- Produces: `ExternalEntitlementAssertion`, `evaluateRequiredEntitlements()`

- [ ] **Step 1: Write failing tests for missing/unknown/invalid/expired/valid**

```ts
import { evaluateRequiredEntitlements } from '../entitlement'

it.each([
  [[], 'EXTERNAL_ENTITLEMENT_MISSING'],
  [[{ entitlementId: 'OEM1', provider: 'oem', subjectRef: 'DM1', capabilityId: 'C1', status: 'UNKNOWN', observedAt: '2026-09-05T00:00:00Z', evidenceRef: 'R1' }], 'EXTERNAL_ENTITLEMENT_UNKNOWN'],
  [[{ entitlementId: 'OEM1', provider: 'oem', subjectRef: 'DM1', capabilityId: 'C1', status: 'INVALID', observedAt: '2026-09-05T00:00:00Z', evidenceRef: 'R1' }], 'EXTERNAL_ENTITLEMENT_INVALID'],
])('fails closed for invalid entitlement state', (assertions, expected) => {
  expect(evaluateRequiredEntitlements(['OEM1'], assertions as never, '2026-09-05T12:00:00Z').reason).toBe(expected)
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/entitlement.test.ts --runInBand
```

- [ ] **Step 3: Implement entitlement evaluation**

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

export type EntitlementReason =
  | 'EXTERNAL_ENTITLEMENT_MISSING'
  | 'EXTERNAL_ENTITLEMENT_INVALID'
  | 'EXTERNAL_ENTITLEMENT_UNKNOWN'
  | 'EXTERNAL_ENTITLEMENT_EXPIRED'

export function evaluateRequiredEntitlements(
  requiredIds: string[], assertions: ExternalEntitlementAssertion[], at: string,
): { matched: boolean; reason?: EntitlementReason } {
  for (const id of requiredIds) {
    const assertion = assertions.find((x) => x.entitlementId === id)
    if (!assertion) return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_MISSING' }
    if (assertion.status === 'UNKNOWN') return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_UNKNOWN' }
    if (assertion.status === 'INVALID') return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_INVALID' }
    if (assertion.expiresAt && Date.parse(assertion.expiresAt) <= Date.parse(at)) {
      return { matched: false, reason: 'EXTERNAL_ENTITLEMENT_EXPIRED' }
    }
  }
  return { matched: true }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
bunx jest src/warden/capability-license/__tests__/entitlement.test.ts --runInBand
git add src/warden/capability-license/entitlement.ts src/warden/capability-license/__tests__/entitlement.test.ts
git commit -m "feat: add external entitlement evaluation"
```

---

### Task 5: Pure Deterministic Licence Evaluator

**Files:**
- Create: `src/warden/capability-license/evaluator.ts`
- Test: `src/warden/capability-license/__tests__/evaluator.test.ts`

**Interfaces:**
- Consumes: registry, licence, constraints, entitlement assertions
- Produces: `CapabilityAdmissionRequest`, `LicenceReasonCode`, `LicenceEvaluationResult`, `evaluateCapabilityLicence()`

- [ ] **Step 1: Write failing tests for precedence and stable grant IDs**

```ts
import { evaluateCapabilityLicence } from '../evaluator'

it('returns MATCH with stable matched grant ID when every licence gate passes', () => {
  const result = evaluateCapabilityLicence(validFixture())
  expect(result).toMatchObject({ decision: 'MATCH', reasonCodes: [], matchedGrantRef: 'G1' })
})

it('denies principal mismatch before any runtime Warden decision exists', () => {
  const f = validFixture(); f.request.principalRef = 'OTHER'
  expect(evaluateCapabilityLicence(f)).toMatchObject({ decision: 'DENY', reasonCodes: ['PRINCIPAL_MISMATCH'] })
})

it('denies a globally non-licensable requested effect even if malformed licence says allow', () => {
  const f = validFixture(); f.request.requestedEffectId = 'VEHICLE_STEER'
  expect(evaluateCapabilityLicence(f).reasonCodes).toContain('EFFECT_NOT_LICENSABLE')
})
```

`validFixture()` must build one complete coherent registry/licence/request/entitlement object in the test file.

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/evaluator.test.ts --runInBand
```

- [ ] **Step 3: Implement request/result types**

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

export type LicenceReasonCode =
  | 'PRINCIPAL_MISMATCH' | 'RELATIONSHIP_MISMATCH' | 'LICENCE_NOT_ACTIVE' | 'LICENCE_NOT_EFFECTIVE'
  | 'LICENCE_EXPIRED' | 'LICENCE_REVOKED' | 'CAPABILITY_NOT_LICENSED' | 'CAPABILITY_NOT_LICENSABLE'
  | 'PURPOSE_NOT_ALLOWED' | 'DATA_CLASS_NOT_ALLOWED' | 'DATA_CLASS_PROHIBITED'
  | 'EFFECT_NOT_ALLOWED' | 'EFFECT_PROHIBITED' | 'EFFECT_NOT_LICENSABLE'
  | 'EXTERNAL_ENTITLEMENT_MISSING' | 'EXTERNAL_ENTITLEMENT_INVALID' | 'EXTERNAL_ENTITLEMENT_UNKNOWN'
  | 'EXTERNAL_ENTITLEMENT_EXPIRED' | 'CONTEXT_REQUIRED_MISSING' | 'CONTEXT_CONSTRAINT_FAILED'
  | 'CONFIRMATION_REQUIRED' | 'CONFIRMATION_INVALID'

export type LicenceEvaluationResult = {
  decision: 'MATCH' | 'DENY'
  reasonCodes: LicenceReasonCode[]
  matchedGrantRef?: string
  licenceRef: string
  licenceVersion: string
  evaluatedAt: string
}
```

- [ ] **Step 4: Implement deterministic precedence**

`evaluateCapabilityLicence()` must check in this order:

```text
principal → relationship → lifecycle/time → registry licensability → grant existence → purpose
→ data prohibit/allow → effect prohibit/allow/registry licensability → entitlement
→ context constraints → confirmation → MATCH
```

Return on the first deterministic denial reason in R0.1. Never call Warden from this function.

- [ ] **Step 5: Run all kernel tests through evaluator**

```bash
bunx jest src/warden/capability-license/__tests__ --runInBand
```

- [ ] **Step 6: Commit**

```bash
git add src/warden/capability-license/evaluator.ts src/warden/capability-license/__tests__/evaluator.test.ts
git commit -m "feat: add deterministic capability licence evaluator"
```

---

### Task 6: External Warden Admission Port and Two-Stage Decision

**Files:**
- Create: `src/warden/capability-license/warden.ts`
- Test: `src/warden/capability-license/__tests__/warden.test.ts`

**Interfaces:**
- Consumes: `LicenceEvaluationResult`, `CapabilityAdmissionRequest`
- Produces: `WardenCapabilityDecision`, `WardenCapabilityAdmissionPort`, `requestWardenDecision()`

- [ ] **Step 1: Write failing tests proving MATCH cannot self-execute**

```ts
import { requestWardenDecision } from '../warden'

it('does not call Warden when licence evaluation is DENY', async () => {
  let called = false
  const result = await requestWardenDecision(denyEvaluation(), request(), { decide: async () => { called = true; throw new Error('must not call') } })
  expect(called).toBe(false)
  expect(result).toBeUndefined()
})

it('requires external Warden ALLOW after licence MATCH', async () => {
  const result = await requestWardenDecision(matchEvaluation(), request(), {
    decide: async () => ({ decision: 'ALLOW', reasonCodes: [], licenceEvaluationRef: 'LE1', wardenDecisionRef: 'WD1', policyVersion: 'W1', evaluatedAt: '2026-09-05T12:00:00Z' }),
  })
  expect(result?.decision).toBe('ALLOW')
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/warden.test.ts --runInBand
```

- [ ] **Step 3: Implement the Warden port only**

```ts
import type { CapabilityAdmissionRequest, LicenceEvaluationResult } from './evaluator'

export type WardenCapabilityDecision = {
  decision: 'ALLOW' | 'DENY'
  reasonCodes: string[]
  licenceEvaluationRef: string
  wardenDecisionRef: string
  policyVersion: string
  evaluatedAt: string
}

export interface WardenCapabilityAdmissionPort {
  decide(request: CapabilityAdmissionRequest, evaluation: LicenceEvaluationResult): Promise<WardenCapabilityDecision>
}

export async function requestWardenDecision(
  evaluation: LicenceEvaluationResult,
  request: CapabilityAdmissionRequest,
  warden: WardenCapabilityAdmissionPort,
): Promise<WardenCapabilityDecision | undefined> {
  if (evaluation.decision !== 'MATCH') return undefined
  return warden.decide(request, evaluation)
}
```

- [ ] **Step 4: Run and commit**

```bash
bunx jest src/warden/capability-license/__tests__/warden.test.ts --runInBand
git add src/warden/capability-license/warden.ts src/warden/capability-license/__tests__/warden.test.ts
git commit -m "feat: separate Warden admission from licence matching"
```

---

### Task 7: River-Compatible Licence Evidence Spine

**Files:**
- Create: `src/warden/capability-license/evidence.ts`
- Test: `src/warden/capability-license/__tests__/evidence.test.ts`

**Interfaces:**
- Produces: `CapabilityLicenseRiverEventType`, `CapabilityLicenseEvidenceSpine`
- Consumes: normalized IDs/reason codes/decision references only

- [ ] **Step 1: Write failing tests for append-only order and sensitive-key rejection**

```ts
import { CapabilityLicenseEvidenceSpine } from '../evidence'

it('chains licence evaluation and Warden decision separately', () => {
  let n = 0
  const spine = new CapabilityLicenseEvidenceSpine({ idFactory: () => `E${++n}`, now: () => '2026-09-05T12:00:00Z' })
  spine.append('S1', 'CAPABILITY_LICENCE_MATCH_EVALUATED', { licenceRef: 'L1', matchedGrantRef: 'G1' })
  spine.append('S1', 'WARDEN_CAPABILITY_DECISION_RECORDED', { wardenDecisionRef: 'WD1', decision: 'ALLOW' })
  expect(spine.events[1].priorEventRef).toBe('E1')
})

it.each(['providerSecret', 'accessToken', 'rawFrame', 'continuousRawAudio', 'biometricTemplate'])(
  'rejects sensitive evidence field %s', (key) => {
    const spine = new CapabilityLicenseEvidenceSpine({ idFactory: () => 'E1', now: () => '2026-09-05T12:00:00Z' })
    expect(() => spine.append('S1', 'CAPABILITY_ADMISSION_REQUESTED', { [key]: 'x' })).toThrow()
  },
)
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/evidence.test.ts --runInBand
```

- [ ] **Step 3: Implement event vocabulary and immutable snapshots**

Event union must contain exactly:

```ts
export type CapabilityLicenseRiverEventType =
  | 'CAPABILITY_LICENCE_ISSUED'
  | 'CAPABILITY_LICENCE_ACTIVATED'
  | 'CAPABILITY_LICENCE_SUSPENDED'
  | 'CAPABILITY_LICENCE_REVOKED'
  | 'CAPABILITY_LICENCE_EXPIRED'
  | 'CAPABILITY_ADMISSION_REQUESTED'
  | 'EXTERNAL_ENTITLEMENT_EVALUATED'
  | 'CAPABILITY_LICENCE_MATCH_EVALUATED'
  | 'WARDEN_CAPABILITY_DECISION_RECORDED'
  | 'CAPABILITY_DEED_EXECUTED'
  | 'CAPABILITY_EFFECT_VERIFIED'
```

Use private backing storage, session-local `priorEventRef`, cloned payloads, and recursive key rejection for raw media/biometric/secret/credential access material.

- [ ] **Step 4: Run and commit**

```bash
bunx jest src/warden/capability-license/__tests__/evidence.test.ts --runInBand
git add src/warden/capability-license/evidence.ts src/warden/capability-license/__tests__/evidence.test.ts
git commit -m "feat: add capability licence River evidence spine"
```

---

### Task 8: Warden Mobility Profile Adapter

**Files:**
- Create: `src/warden/capability-license/mobility-profile.ts`
- Test: `src/warden/capability-license/__tests__/mobility-profile.test.ts`

**Interfaces:**
- Consumes: generic registry/licence types
- Produces: `WARDEN_MOBILITY_REGISTRY_R01`, `createWardenMobilityLicence()`

- [ ] **Step 1: Write failing tests proving Mobility cannot license forbidden actuation**

```ts
import { WARDEN_MOBILITY_REGISTRY_R01, createWardenMobilityLicence } from '../mobility-profile'
import { validateCapabilityLicence } from '../licence'

it('marks safety-critical vehicle effects and ADB/Autolink privileged execution non-licensable', () => {
  const forbidden = ['VEHICLE_STEER','VEHICLE_BRAKE','VEHICLE_THROTTLE','VEHICLE_AEB_CONTROL','VEHICLE_ACC_CONTROL','VEHICLE_CAN_WRITE','ADB_EXECUTION','AUTOLINK_PRIVILEGED_EXECUTION']
  for (const id of forbidden) expect(WARDEN_MOBILITY_REGISTRY_R01.effects.find((x) => x.effectId === id)?.licensable).toBe(false)
})

it('produces a valid read-only/advisory Mobility licence', () => {
  const value = createWardenMobilityLicence({ principalRef: 'DM1', relationshipRef: 'VEH1', genesisRecordRef: 'GEN1', riverEvidenceRef: 'R1', issuedByRef: 'I1', effectiveFrom: '2026-09-05T00:00:00Z', expiresAt: '2026-09-06T00:00:00Z' })
  expect(validateCapabilityLicence(value, WARDEN_MOBILITY_REGISTRY_R01)).toEqual([])
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/mobility-profile.test.ts --runInBand
```

- [ ] **Step 3: Implement the Mobility registry/profile**

Registry must include the six approved capability IDs:

```text
WARDENFM_MEDIA_CONTROL
WARDENFM_CONTEXT_MEDIA_ROUTE
WARDEN_VOICE_INTENT
WARDEN_GESTURE_INTENT
MOBILITY_READ_ADAS_STATE
DIGITAL_MIRROR_MOBILITY_PROGRESS
```

and the approved purpose/data/effect IDs from the spec. `MOBILITY_READ_ADAS_STATE` may require external entitlement but must expose no vehicle-actuation effect.

- [ ] **Step 4: Run generic + Mobility tests and commit**

```bash
bunx jest src/warden/capability-license/__tests__ --runInBand
git add src/warden/capability-license/mobility-profile.ts src/warden/capability-license/__tests__/mobility-profile.test.ts
git commit -m "feat: add Warden Mobility capability licence profile"
```

---

### Task 9: DigitalMe Card Read-Only Projection

**Files:**
- Create: `src/warden/capability-license/digitalme-card.ts`
- Test: `src/warden/capability-license/__tests__/digitalme-card.test.ts`

**Interfaces:**
- Consumes: licence, registry, entitlement assertions, current time
- Produces: `DigitalMeCapabilityCardState`, `projectDigitalMeCapabilityCard()`

- [ ] **Step 1: Write failing tests distinguishing envelope from executability**

```ts
import { projectDigitalMeCapabilityCard } from '../digitalme-card'

it('never renders a licensed envelope as executable authority', () => {
  const card = projectDigitalMeCapabilityCard(validLicence(), registry(), [], '2026-09-05T12:00:00Z')
  expect(card.capabilities[0].state).toBe('AVAILABLE_WARDEN_ADMISSION_REQUIRED')
  expect(card.capabilities[0]).not.toHaveProperty('allowedNow', true)
})

it('shows external entitlement dependency explicitly', () => {
  const card = projectDigitalMeCapabilityCard(adasLicence(), registry(), [], '2026-09-05T12:00:00Z')
  expect(card.capabilities[0].state).toBe('LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED')
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/warden/capability-license/__tests__/digitalme-card.test.ts --runInBand
```

- [ ] **Step 3: Implement derived projection state**

```ts
export type DigitalMeCapabilityCardState =
  | 'LICENSED_ENVELOPE'
  | 'LICENSED_EXTERNAL_ENTITLEMENT_REQUIRED'
  | 'AVAILABLE_WARDEN_ADMISSION_REQUIRED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'NOT_LICENSED'
  | 'NON_LICENSABLE'
```

Projection is read-only and may never expose a direct runtime `ALLOW`. Active grants without unresolved external entitlement should normally project `AVAILABLE_WARDEN_ADMISSION_REQUIRED`, because Warden runtime admission is still mandatory.

- [ ] **Step 4: Run and commit**

```bash
bunx jest src/warden/capability-license/__tests__/digitalme-card.test.ts --runInBand
git add src/warden/capability-license/digitalme-card.ts src/warden/capability-license/__tests__/digitalme-card.test.ts
git commit -m "feat: add DigitalMe capability card projection"
```

---

### Task 10: Public Exports and Portable Acceptance Verification

**Files:**
- Create: `src/warden/capability-license/index.ts`
- Create: `docs/verification/warden-capability-license-r0.1-portable-verification.md`

**Interfaces:**
- Exports all stable R0.1 public contracts from one package entry point.

- [ ] **Step 1: Add explicit public exports**

```ts
export * from './registry'
export * from './licence'
export * from './constraints'
export * from './entitlement'
export * from './evaluator'
export * from './warden'
export * from './evidence'
export * from './mobility-profile'
export * from './digitalme-card'
```

- [ ] **Step 2: Run complete capability-license Jest suite**

```bash
bunx jest src/warden/capability-license/__tests__ --runInBand
```

Record exact suites/tests/pass/fail counts.

- [ ] **Step 3: Run full WardenFM + licence regression gate**

```bash
bunx jest src/wardenfm/__tests__ src/warden/capability-license/__tests__ --runInBand
bunx tsc --noEmit
```

Do not label complete if the repository runner cannot execute these commands.

- [ ] **Step 4: Run forbidden-capability scan**

```bash
git grep -n -E "VEHICLE_STEER|VEHICLE_BRAKE|VEHICLE_THROTTLE|VEHICLE_AEB_CONTROL|VEHICLE_ACC_CONTROL|VEHICLE_CAN_WRITE|ADB_EXECUTION|AUTOLINK_PRIVILEGED_EXECUTION" -- src/warden/capability-license
```

Every match must be either a non-licensable registry definition, deny/validation logic, or test assertion. No execution adapter for these effects may exist.

- [ ] **Step 5: Record the eighteen acceptance criteria**

Verification document must mark each approved spec acceptance criterion `PASS`, `BLOCKED`, or `FAIL`, with evidence. Release header:

```text
Contract state: PORTABLE_CONTRACT_IMPLEMENTED  # only when all portable gates pass
Authority: WARDEN_EXTERNAL
Registry authority: GENESIS
Evidence: RIVER
Operator: SYNNERGYZE_NO_AUTHORITY
First profile: WARDEN_MOBILITY
Safety-critical vehicle actuation: NON_LICENSABLE
ADB execution: NON_LICENSABLE / HARD_DENIED
Autolink privileged execution: NON_LICENSABLE / PROBE_ONLY
```

If Jest/typecheck cannot execute, use `PORTABLE_CONTRACT_PARTIALLY_VERIFIED` instead.

- [ ] **Step 6: Commit final package and verification record**

```bash
git add src/warden/capability-license/index.ts docs/verification/warden-capability-license-r0.1-portable-verification.md
git commit -m "docs: verify Warden capability licence R0.1"
```

---

## Plan Self-Review

### Spec coverage

- Registry contracts/global non-licensable precedence: Task 1.
- Licence grant IDs, lifecycle shape, contradiction/broadening validation: Task 2.
- Bounded context grammar: Task 3.
- External entitlement separation: Task 4.
- Pure licence `MATCH`/`DENY`: Task 5.
- Separate Warden runtime `ALLOW`/`DENY`: Task 6.
- River lifecycle/evaluation/decision/effect evidence separation: Task 7.
- Mobility profile and all non-licensable vehicle/ADB/Autolink effects: Task 8.
- DigitalMe Card envelope projection: Task 9.
- Public package surface and all acceptance checks: Task 10.

### Placeholder scan

No implementation placeholders remain. Jurisdictional legal text, cryptographic signing, settlement, federation, wildcard inheritance, native Card UI, and safety-critical actuation remain explicitly deferred by the approved spec rather than unspecified.

### Type consistency

- `CapabilityLicenseRegistry` originates only in `registry.ts`.
- `CapabilityLicence`/`CapabilityLicenceGrant`/`ContextConstraint` originate only in `licence.ts`.
- `CapabilityAdmissionRequest` and `LicenceEvaluationResult` originate only in `evaluator.ts`.
- `WardenCapabilityDecision` is separate and originates only in `warden.ts`.
- Mobility consumes generic types and does not duplicate licence evaluator semantics.
- DigitalMe Card projects licence state and never returns runtime Warden authority.
