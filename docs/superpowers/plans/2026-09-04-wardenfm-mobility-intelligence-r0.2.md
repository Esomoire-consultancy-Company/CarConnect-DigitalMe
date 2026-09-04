# WardenFM Mobility Intelligence R0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portable, fail-closed Warden Mobility Intelligence layer that normalizes traffic/route/ADAS context, emits bounded voice and gesture intent tokens, recommends deterministic media profiles, manages expiring Digital Mirror mobility grants, and records River-compatible evidence without granting vehicle-control authority.

**Architecture:** Add a focused `src/wardenfm/mobility/` package beside the existing R0.1 session/playback boundary. Pure TypeScript contracts and policy logic are implemented first and tested independently; only the final task adapts the existing playback/runtime surfaces for admitted non-safety effects such as duck/pause/resume. Native speech, camera, AAOS, OEM ADAS, and Autolink providers remain adapters outside this plan.

**Tech Stack:** React Native 0.83.x, TypeScript 5.9.x, Jest 30.x, existing WardenFM R0.1 session/playback contracts, no new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-04-wardenfm-mobility-intelligence-r0.2-design.md`

## Global Constraints

- Voice input expresses intent; it does not grant authority.
- Gesture input expresses intent or step-up confirmation; it does not establish identity by itself.
- Camera and microphone activation require explicit, purpose-bound Warden admission.
- No covert microphone, camera, or background biometric capture.
- Raw camera frames are not retained by default.
- No face recognition, voiceprint identity, hand-shape biometric identity, or emotion inference in R0.2.
- OEM/vehicle ADAS warnings remain authoritative for vehicle safety presentation.
- No steering, braking, throttle, lane-centering, AEB, ACC, CAN-bus, or other safety-critical actuation.
- `ADB_EXECUTION` remains hard-denied.
- Autolink remains probe-only.
- No shell execution, package installation, firmware modification, touch injection, or USB-debug enablement.
- No capture or rebroadcast of third-party music streams.
- No provider credentials or secrets in Digital Mirror or River payloads.
- All new capability grants are scoped, effective-dated, expiring, revocable, and evidence-linked.
- Unknown context remains `UNKNOWN`; never infer missing traffic/route/ADAS facts.
- Passing portable tests does not qualify any Android/vehicle/OEM integration for production.

---

## File Map

Create a new focused package:

```text
src/wardenfm/mobility/
├── context.ts                 # normalized mobility context types + validation
├── media-router.ts            # deterministic bounded profile recommendation
├── voice-intent.ts            # bounded voice-intent candidate normalization
├── gesture.ts                 # bounded gesture-token normalization + mapping
├── digital-mirror.ts          # mobility progression + expiring/revocable grants
├── evidence.ts                # R0.2 River event envelope + privacy guard
├── admission.ts               # Warden admission/step-up interfaces and decisions
└── coordinator.ts             # policy-only orchestration of context/intent/effects

src/wardenfm/__tests__/
├── mobility-context.test.ts
├── mobility-voice.test.ts
├── mobility-gesture.test.ts
├── mobility-digital-mirror.test.ts
├── mobility-evidence.test.ts
└── mobility-coordinator.test.ts
```

Modify only in the final integration task:

```text
src/wardenfm/playback-gate.ts
src/wardenfm/runtime.ts
src/wardenfm/__tests__/playback-gate.test.ts
.github/workflows/build-android.yml
```

---

### Task 1: Normalize Mobility Context and Deterministically Recommend Media Profiles

**Files:**
- Create: `src/wardenfm/mobility/context.ts`
- Create: `src/wardenfm/mobility/media-router.ts`
- Test: `src/wardenfm/__tests__/mobility-context.test.ts`

**Interfaces:**
- Produces: `MobilityContextSnapshot`, `normalizeMobilityContext()`, `ContextMediaProfile`, `recommendContextMediaProfile()`
- Consumes: no earlier R0.2 modules

- [ ] **Step 1: Write failing tests for unknown preservation, deterministic routing, and priority order**

```ts
import { normalizeMobilityContext } from '../mobility/context'
import { recommendContextMediaProfile } from '../mobility/media-router'

describe('Warden mobility context routing', () => {
  it('preserves unavailable facts as UNKNOWN', () => {
    expect(normalizeMobilityContext({ observedAt: '2026-09-04T12:00:00.000Z' })).toEqual({
      observedAt: '2026-09-04T12:00:00.000Z',
      trafficState: 'UNKNOWN',
      routeComplexity: 'UNKNOWN',
      tripPhase: 'UNKNOWN',
      speedVarianceBand: 'UNKNOWN',
      adasPriority: 'NONE',
      sourceRefs: [],
    })
  })

  it('routes urgent ADAS above every ordinary media profile', () => {
    const context = normalizeMobilityContext({
      observedAt: '2026-09-04T12:00:00.000Z',
      trafficState: 'FREE_FLOW',
      routeComplexity: 'LOW',
      adasPriority: 'URGENT',
    })
    expect(recommendContextMediaProfile(context, { allowContextRouting: true })).toBe('ADAS_PRIORITY')
  })

  it('routes high route complexity before traffic-based genre routing', () => {
    const context = normalizeMobilityContext({
      observedAt: '2026-09-04T12:00:00.000Z',
      trafficState: 'STOP_START',
      routeComplexity: 'HIGH',
    })
    expect(recommendContextMediaProfile(context, { allowContextRouting: true })).toBe('NAV_PRIORITY')
  })

  it('falls back to user default when contextual routing is not admitted', () => {
    const context = normalizeMobilityContext({
      observedAt: '2026-09-04T12:00:00.000Z',
      trafficState: 'DENSE',
    })
    expect(recommendContextMediaProfile(context, { allowContextRouting: false })).toBe('USER_DEFAULT')
  })
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
bunx jest src/wardenfm/__tests__/mobility-context.test.ts --runInBand
```

Expected: FAIL because the mobility modules do not exist.

- [ ] **Step 3: Implement normalized context with allowlisted values only**

`src/wardenfm/mobility/context.ts`:

```ts
export type MobilityTrafficState = 'UNKNOWN' | 'FREE_FLOW' | 'MODERATE' | 'DENSE' | 'STOP_START'
export type MobilityRouteComplexity = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH'
export type MobilityTripPhase = 'UNKNOWN' | 'DEPARTURE' | 'CRUISE' | 'APPROACH' | 'ARRIVAL'
export type MobilitySpeedVarianceBand = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH'
export type AdasPriority = 'NONE' | 'INFORMATION' | 'CAUTION' | 'URGENT'

export type MobilityContextSnapshot = {
  observedAt: string
  trafficState: MobilityTrafficState
  routeComplexity: MobilityRouteComplexity
  tripPhase: MobilityTripPhase
  speedVarianceBand: MobilitySpeedVarianceBand
  adasPriority: AdasPriority
  sourceRefs: string[]
}

export type MobilityContextInput = Partial<Omit<MobilityContextSnapshot, 'observedAt'>> & {
  observedAt: string
}

const TRAFFIC = new Set<MobilityTrafficState>(['UNKNOWN', 'FREE_FLOW', 'MODERATE', 'DENSE', 'STOP_START'])
const ROUTE = new Set<MobilityRouteComplexity>(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'])
const TRIP = new Set<MobilityTripPhase>(['UNKNOWN', 'DEPARTURE', 'CRUISE', 'APPROACH', 'ARRIVAL'])
const SPEED = new Set<MobilitySpeedVarianceBand>(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'])
const ADAS = new Set<AdasPriority>(['NONE', 'INFORMATION', 'CAUTION', 'URGENT'])

export function normalizeMobilityContext(input: MobilityContextInput): MobilityContextSnapshot {
  return {
    observedAt: input.observedAt,
    trafficState: TRAFFIC.has(input.trafficState as MobilityTrafficState) ? input.trafficState! : 'UNKNOWN',
    routeComplexity: ROUTE.has(input.routeComplexity as MobilityRouteComplexity) ? input.routeComplexity! : 'UNKNOWN',
    tripPhase: TRIP.has(input.tripPhase as MobilityTripPhase) ? input.tripPhase! : 'UNKNOWN',
    speedVarianceBand: SPEED.has(input.speedVarianceBand as MobilitySpeedVarianceBand) ? input.speedVarianceBand! : 'UNKNOWN',
    adasPriority: ADAS.has(input.adasPriority as AdasPriority) ? input.adasPriority! : 'NONE',
    sourceRefs: [...(input.sourceRefs ?? [])],
  }
}
```

- [ ] **Step 4: Implement deterministic profile routing**

`src/wardenfm/mobility/media-router.ts`:

```ts
import type { MobilityContextSnapshot } from './context'

export type ContextMediaProfile =
  | 'FOCUS_LOW_COMPLEXITY'
  | 'CRUISE'
  | 'ENERGY'
  | 'CALM'
  | 'WARDEN_BRIEFING'
  | 'NAV_PRIORITY'
  | 'ADAS_PRIORITY'
  | 'USER_DEFAULT'

export type ContextMediaPreferences = {
  allowContextRouting: boolean
  preferredCruiseProfile?: Extract<ContextMediaProfile, 'CRUISE' | 'ENERGY' | 'CALM'>
}

export function recommendContextMediaProfile(
  context: MobilityContextSnapshot,
  preferences: ContextMediaPreferences,
): ContextMediaProfile {
  if (!preferences.allowContextRouting) return 'USER_DEFAULT'
  if (context.adasPriority === 'URGENT') return 'ADAS_PRIORITY'
  if (context.routeComplexity === 'HIGH') return 'NAV_PRIORITY'
  if (context.trafficState === 'DENSE' || context.trafficState === 'STOP_START') return 'FOCUS_LOW_COMPLEXITY'
  if (context.tripPhase === 'CRUISE' && context.trafficState === 'FREE_FLOW') {
    return preferences.preferredCruiseProfile ?? 'CRUISE'
  }
  return 'USER_DEFAULT'
}
```

- [ ] **Step 5: Run Task 1 tests and the existing R0.1 suite**

```bash
bunx jest src/wardenfm/__tests__/mobility-context.test.ts --runInBand
bunx jest src/wardenfm/__tests__ --runInBand
```

Expected: PASS; R0.1 ADB hard-denial tests remain green.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/wardenfm/mobility/context.ts src/wardenfm/mobility/media-router.ts src/wardenfm/__tests__/mobility-context.test.ts
git commit -m "feat: add Warden mobility context media routing"
```

---

### Task 2: Add Bounded Voice Intent Candidates and Fail-Closed Admission

**Files:**
- Create: `src/wardenfm/mobility/voice-intent.ts`
- Create: `src/wardenfm/mobility/admission.ts`
- Test: `src/wardenfm/__tests__/mobility-voice.test.ts`

**Interfaces:**
- Consumes: no microphone runtime; receives already-recognized provider candidates
- Produces: `WardenVoiceIntent`, `VoiceIntentCandidate`, `normalizeVoiceIntentCandidate()`, `WardenMobilityAdmissionPort`

- [ ] **Step 1: Write failing tests proving low-confidence and unsupported candidates cannot execute**

```ts
import { normalizeVoiceIntentCandidate } from '../mobility/voice-intent'

describe('Warden mobility voice intent', () => {
  it('accepts an allowlisted intent only above threshold', () => {
    expect(normalizeVoiceIntentCandidate({
      intent: 'PAUSE_MEDIA',
      confidence: 0.92,
      threshold: 0.8,
      sourceRef: 'voice-1',
      sessionRef: 'session-1',
    }).intent).toBe('PAUSE_MEDIA')
  })

  it('returns NO_ACTION when confidence is below policy threshold', () => {
    expect(normalizeVoiceIntentCandidate({
      intent: 'PAUSE_MEDIA', confidence: 0.5, threshold: 0.8,
      sourceRef: 'voice-2', sessionRef: 'session-1',
    }).intent).toBe('NO_ACTION')
  })

  it('returns NO_ACTION for unsupported provider output', () => {
    expect(normalizeVoiceIntentCandidate({
      intent: 'OPEN_SHELL', confidence: 1, threshold: 0.8,
      sourceRef: 'voice-3', sessionRef: 'session-1',
    }).intent).toBe('NO_ACTION')
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/wardenfm/__tests__/mobility-voice.test.ts --runInBand
```

Expected: FAIL because `voice-intent.ts` does not exist.

- [ ] **Step 3: Implement the bounded intent vocabulary and candidate normalization**

```ts
export type WardenVoiceIntent =
  | 'EXPLAIN_CONTEXT'
  | 'REDUCE_DISTRACTION'
  | 'FOCUS_MODE'
  | 'RESUME_WARDENFM'
  | 'PAUSE_MEDIA'
  | 'NEXT_MEDIA'
  | 'PREVIOUS_MEDIA'
  | 'SELECT_CONTEXT_PROFILE'
  | 'CANCEL'

export type NormalizedVoiceIntent = WardenVoiceIntent | 'NO_ACTION'

export type VoiceIntentCandidate = {
  intent: string
  confidence: number
  threshold: number
  sourceRef: string
  sessionRef: string
}

export type VoiceIntentResult = {
  intent: NormalizedVoiceIntent
  confidence: number
  sourceRef: string
  sessionRef: string
}

const ALLOWED = new Set<WardenVoiceIntent>([
  'EXPLAIN_CONTEXT', 'REDUCE_DISTRACTION', 'FOCUS_MODE', 'RESUME_WARDENFM',
  'PAUSE_MEDIA', 'NEXT_MEDIA', 'PREVIOUS_MEDIA', 'SELECT_CONTEXT_PROFILE', 'CANCEL',
])

export function normalizeVoiceIntentCandidate(candidate: VoiceIntentCandidate): VoiceIntentResult {
  const admitted = candidate.confidence >= candidate.threshold && ALLOWED.has(candidate.intent as WardenVoiceIntent)
  return {
    intent: admitted ? candidate.intent as WardenVoiceIntent : 'NO_ACTION',
    confidence: candidate.confidence,
    sourceRef: candidate.sourceRef,
    sessionRef: candidate.sessionRef,
  }
}
```

- [ ] **Step 4: Define the Warden admission boundary without implementing authority inside the mobility package**

`src/wardenfm/mobility/admission.ts`:

```ts
export type MobilityEffect =
  | 'PAUSE_MEDIA'
  | 'RESUME_MEDIA'
  | 'NEXT_MEDIA'
  | 'PREVIOUS_MEDIA'
  | 'APPLY_CONTEXT_PROFILE'
  | 'DUCK_MEDIA'
  | 'VOICE_EXPLANATION'
  | 'DIGITAL_MIRROR_GRANT'

export type MobilityAdmissionRequest = {
  effect: MobilityEffect
  purpose: string
  digitalMeSessionRef: string
  contextRef?: string
  confirmationRef?: string
}

export type MobilityAdmissionDecision = {
  allowed: boolean
  wardenDecisionRef: string
}

export interface WardenMobilityAdmissionPort {
  decide(request: MobilityAdmissionRequest): Promise<MobilityAdmissionDecision>
}
```

- [ ] **Step 5: Run Task 2 and all WardenFM tests**

```bash
bunx jest src/wardenfm/__tests__/mobility-voice.test.ts --runInBand
bunx jest src/wardenfm/__tests__ --runInBand
```

- [ ] **Step 6: Commit Task 2**

```bash
git add src/wardenfm/mobility/voice-intent.ts src/wardenfm/mobility/admission.ts src/wardenfm/__tests__/mobility-voice.test.ts
git commit -m "feat: add bounded Warden mobility voice intents"
```

---

### Task 3: Add Local Gesture Tokens and Step-Up Confirmation Mapping

**Files:**
- Create: `src/wardenfm/mobility/gesture.ts`
- Test: `src/wardenfm/__tests__/mobility-gesture.test.ts`

**Interfaces:**
- Consumes: provider candidates containing only token/confidence/session metadata, not frames
- Produces: `WardenGestureToken`, `normalizeGestureCandidate()`, `gestureIntent()`, `isStepUpConfirmation()`

- [ ] **Step 1: Write failing gesture tests**

```ts
import { gestureIntent, isStepUpConfirmation, normalizeGestureCandidate } from '../mobility/gesture'

describe('Warden gesture grammar', () => {
  it('maps an admitted swipe to next media intent', () => {
    const result = normalizeGestureCandidate({
      token: 'SWIPE_RIGHT', confidence: 0.95, threshold: 0.8,
      sourceRef: 'gesture-1', sessionRef: 'session-1',
    })
    expect(result.token).toBe('SWIPE_RIGHT')
    expect(gestureIntent(result.token)).toBe('NEXT_MEDIA')
  })

  it('treats low-confidence gesture as UNKNOWN', () => {
    expect(normalizeGestureCandidate({
      token: 'THUMBS_UP', confidence: 0.4, threshold: 0.8,
      sourceRef: 'gesture-2', sessionRef: 'session-1',
    }).token).toBe('UNKNOWN')
  })

  it('allows thumbs up to confirm only after a trusted DigitalMe session is known', () => {
    expect(isStepUpConfirmation('THUMBS_UP', true)).toBe(true)
    expect(isStepUpConfirmation('THUMBS_UP', false)).toBe(false)
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/wardenfm/__tests__/mobility-gesture.test.ts --runInBand
```

- [ ] **Step 3: Implement gesture normalization and intent mapping**

```ts
import type { NormalizedVoiceIntent } from './voice-intent'

export type WardenGestureToken =
  | 'PALM_STOP'
  | 'SWIPE_RIGHT'
  | 'SWIPE_LEFT'
  | 'THUMBS_UP'
  | 'CLOSED_HAND_CANCEL'
  | 'POINT_HOLD_CONFIRM'
  | 'UNKNOWN'

export type GestureCandidate = {
  token: string
  confidence: number
  threshold: number
  sourceRef: string
  sessionRef: string
}

export type GestureResult = {
  token: WardenGestureToken
  confidence: number
  sourceRef: string
  sessionRef: string
}

const TOKENS = new Set<WardenGestureToken>([
  'PALM_STOP', 'SWIPE_RIGHT', 'SWIPE_LEFT', 'THUMBS_UP',
  'CLOSED_HAND_CANCEL', 'POINT_HOLD_CONFIRM', 'UNKNOWN',
])

export function normalizeGestureCandidate(candidate: GestureCandidate): GestureResult {
  const valid = candidate.confidence >= candidate.threshold && TOKENS.has(candidate.token as WardenGestureToken)
  return {
    token: valid ? candidate.token as WardenGestureToken : 'UNKNOWN',
    confidence: candidate.confidence,
    sourceRef: candidate.sourceRef,
    sessionRef: candidate.sessionRef,
  }
}

export function gestureIntent(token: WardenGestureToken): NormalizedVoiceIntent {
  switch (token) {
    case 'PALM_STOP': return 'PAUSE_MEDIA'
    case 'SWIPE_RIGHT': return 'NEXT_MEDIA'
    case 'SWIPE_LEFT': return 'PREVIOUS_MEDIA'
    case 'CLOSED_HAND_CANCEL': return 'CANCEL'
    default: return 'NO_ACTION'
  }
}

export function isStepUpConfirmation(token: WardenGestureToken, trustedDigitalMeSession: boolean): boolean {
  if (!trustedDigitalMeSession) return false
  return token === 'THUMBS_UP' || token === 'POINT_HOLD_CONFIRM'
}
```

- [ ] **Step 4: Add a test that the gesture module has no raw-frame field**

Add to the test:

```ts
it('returns only bounded token metadata and no frame payload', () => {
  const result = normalizeGestureCandidate({
    token: 'PALM_STOP', confidence: 1, threshold: 0.8,
    sourceRef: 'gesture-3', sessionRef: 'session-1',
  })
  expect(Object.keys(result).sort()).toEqual(['confidence', 'sessionRef', 'sourceRef', 'token'])
})
```

- [ ] **Step 5: Run tests and commit**

```bash
bunx jest src/wardenfm/__tests__/mobility-gesture.test.ts --runInBand
bunx jest src/wardenfm/__tests__ --runInBand
git add src/wardenfm/mobility/gesture.ts src/wardenfm/__tests__/mobility-gesture.test.ts
git commit -m "feat: add Warden mobility gesture grammar"
```

---

### Task 4: Add Digital Mirror Mobility Progression and Expiring/Revocable Grants

**Files:**
- Create: `src/wardenfm/mobility/digital-mirror.ts`
- Test: `src/wardenfm/__tests__/mobility-digital-mirror.test.ts`

**Interfaces:**
- Produces: `MobilityProgressState`, `MobilityCapabilityGrant`, `DigitalMirrorMobilityState`
- Consumes: trusted DigitalMe and vehicle-relationship refs supplied by caller

- [ ] **Step 1: Write failing tests for grant creation, expiry, revocation, and no implicit elevation**

```ts
import { DigitalMirrorMobilityState } from '../mobility/digital-mirror'

describe('Digital Mirror mobility state', () => {
  const grant = {
    grantId: 'grant-1',
    digitalMeId: 'dm-1',
    vehicleRelationshipRef: 'veh-rel-1',
    capability: 'context-media-routing',
    purpose: 'driver-media-personalization',
    effectiveFrom: '2026-09-04T12:00:00.000Z',
    expiresAt: '2026-09-04T13:00:00.000Z',
    wardenDecisionRef: 'warden-1',
    riverEvidenceRef: 'river-1',
  }

  it('authorizes only an active matching grant', () => {
    const state = new DigitalMirrorMobilityState()
    state.grant(grant)
    expect(state.hasCapability('context-media-routing', '2026-09-04T12:30:00.000Z')).toBe(true)
    expect(state.hasCapability('context-media-routing', '2026-09-04T14:00:00.000Z')).toBe(false)
  })

  it('revocation removes capability immediately', () => {
    const state = new DigitalMirrorMobilityState()
    state.grant(grant)
    state.revoke('grant-1')
    expect(state.hasCapability('context-media-routing', '2026-09-04T12:30:00.000Z')).toBe(false)
  })

  it('progress state alone never authorizes a capability', () => {
    const state = new DigitalMirrorMobilityState()
    state.progressTo('ROUTINE_ESTABLISHED')
    expect(state.hasCapability('context-media-routing', '2026-09-04T12:30:00.000Z')).toBe(false)
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/wardenfm/__tests__/mobility-digital-mirror.test.ts --runInBand
```

- [ ] **Step 3: Implement explicit state and grant registry**

```ts
export type MobilityProgressState =
  | 'SESSION_BOUND'
  | 'CONTEXT_KNOWN'
  | 'WARDEN_ADMITTED'
  | 'VOICE_AVAILABLE'
  | 'GESTURE_AVAILABLE'
  | 'MEDIA_PROFILE_ACTIVE'
  | 'ROUTINE_ESTABLISHED'

export type MobilityCapabilityGrant = {
  grantId: string
  digitalMeId: string
  vehicleRelationshipRef: string
  capability: string
  purpose: string
  effectiveFrom: string
  expiresAt: string
  wardenDecisionRef: string
  riverEvidenceRef: string
}

export class DigitalMirrorMobilityState {
  private progress: MobilityProgressState = 'SESSION_BOUND'
  private readonly grants = new Map<string, MobilityCapabilityGrant>()
  private readonly revoked = new Set<string>()

  public progressTo(state: MobilityProgressState): void {
    this.progress = state
  }

  public get progressState(): MobilityProgressState {
    return this.progress
  }

  public grant(grant: MobilityCapabilityGrant): void {
    if (!grant.purpose || !grant.wardenDecisionRef || !grant.riverEvidenceRef) {
      throw new Error('Mobility grant requires purpose, Warden decision, and River evidence')
    }
    if (Date.parse(grant.expiresAt) <= Date.parse(grant.effectiveFrom)) {
      throw new Error('Mobility grant expiry must be after effective time')
    }
    this.grants.set(grant.grantId, { ...grant })
    this.revoked.delete(grant.grantId)
  }

  public revoke(grantId: string): void {
    if (this.grants.has(grantId)) this.revoked.add(grantId)
  }

  public hasCapability(capability: string, at: string): boolean {
    const time = Date.parse(at)
    for (const grant of this.grants.values()) {
      if (this.revoked.has(grant.grantId)) continue
      if (grant.capability !== capability) continue
      if (Date.parse(grant.effectiveFrom) <= time && time < Date.parse(grant.expiresAt)) return true
    }
    return false
  }
}
```

- [ ] **Step 4: Run all tests and commit**

```bash
bunx jest src/wardenfm/__tests__/mobility-digital-mirror.test.ts --runInBand
bunx jest src/wardenfm/__tests__ --runInBand
git add src/wardenfm/mobility/digital-mirror.ts src/wardenfm/__tests__/mobility-digital-mirror.test.ts
git commit -m "feat: add Digital Mirror mobility grants"
```

---

### Task 5: Add Privacy-Bounded River Evidence for Mobility Decisions

**Files:**
- Create: `src/wardenfm/mobility/evidence.ts`
- Test: `src/wardenfm/__tests__/mobility-evidence.test.ts`

**Interfaces:**
- Produces: `MobilityRiverEventType`, `MobilityRiverEvent`, `createMobilityEvidenceEvent()`
- Consumes: normalized metadata only

- [ ] **Step 1: Write failing evidence tests**

```ts
import { createMobilityEvidenceEvent } from '../mobility/evidence'

describe('Warden mobility River evidence', () => {
  it('creates an ordered normalized event', () => {
    expect(createMobilityEvidenceEvent({
      eventId: 'm-1', sessionRef: 's-1', type: 'MOBILITY_CONTEXT_OBSERVED',
      at: '2026-09-04T12:00:00.000Z', payload: { trafficState: 'DENSE' },
    })).toMatchObject({ eventId: 'm-1', sessionRef: 's-1', type: 'MOBILITY_CONTEXT_OBSERVED' })
  })

  it.each(['rawFrame', 'audioRecording', 'voiceprint', 'biometricTemplate', 'providerSecret', 'password', 'token'])(
    'rejects privacy-sensitive evidence key %s',
    (key) => {
      expect(() => createMobilityEvidenceEvent({
        eventId: 'm-2', sessionRef: 's-1', type: 'GESTURE_TOKEN_RECOGNIZED',
        at: '2026-09-04T12:00:00.000Z', payload: { [key]: 'forbidden' },
      })).toThrow()
    },
  )
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/wardenfm/__tests__/mobility-evidence.test.ts --runInBand
```

- [ ] **Step 3: Implement event vocabulary and recursive privacy-key guard**

```ts
export type MobilityRiverEventType =
  | 'MOBILITY_CONTEXT_OBSERVED'
  | 'VOICE_INTENT_RECOGNIZED'
  | 'GESTURE_TOKEN_RECOGNIZED'
  | 'STEP_UP_CONFIRMATION_REQUESTED'
  | 'STEP_UP_CONFIRMATION_DECIDED'
  | 'CONTEXT_MEDIA_PROFILE_RECOMMENDED'
  | 'CONTEXT_MEDIA_PROFILE_ADMITTED'
  | 'DIGITAL_MIRROR_MOBILITY_STATE_CHANGED'
  | 'MOBILITY_CAPABILITY_GRANTED'
  | 'MOBILITY_CAPABILITY_REVOKED'
  | 'MOBILITY_EFFECT_VERIFIED'

export type MobilityRiverEvent = {
  eventId: string
  sessionRef: string
  type: MobilityRiverEventType
  at: string
  payload: Record<string, unknown>
  wardenDecisionRef?: string
  priorEventRef?: string
}

const FORBIDDEN_KEY = /(rawframe|audiorecording|voiceprint|biometrictemplate|providersecret|password|credential|token)/i

function assertSafe(value: unknown, path = 'payload'): void {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error(`Forbidden mobility evidence field: ${path}.${key}`)
    assertSafe(child, `${path}.${key}`)
  }
}

export function createMobilityEvidenceEvent(event: MobilityRiverEvent): MobilityRiverEvent {
  assertSafe(event.payload)
  return { ...event, payload: { ...event.payload } }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
bunx jest src/wardenfm/__tests__/mobility-evidence.test.ts --runInBand
bunx jest src/wardenfm/__tests__ --runInBand
git add src/wardenfm/mobility/evidence.ts src/wardenfm/__tests__/mobility-evidence.test.ts
git commit -m "feat: add privacy-bounded mobility evidence"
```

---

### Task 6: Coordinate Context, Warden Admission, Step-Up Confirmation, and Non-Safety Effects

**Files:**
- Create: `src/wardenfm/mobility/coordinator.ts`
- Test: `src/wardenfm/__tests__/mobility-coordinator.test.ts`

**Interfaces:**
- Consumes: `MobilityContextSnapshot`, `recommendContextMediaProfile()`, `WardenMobilityAdmissionPort`, normalized voice/gesture results
- Produces: `WardenMobilityCoordinator.recommendProfile()`, `.requestEffect()`, `.handleUrgentAdas()`

- [ ] **Step 1: Write failing coordinator tests proving Warden remains the execution gate**

```ts
import { WardenMobilityCoordinator } from '../mobility/coordinator'
import { normalizeMobilityContext } from '../mobility/context'

describe('Warden mobility coordinator', () => {
  it('does not execute a recommended media profile when Warden denies it', async () => {
    const effects: string[] = []
    const coordinator = new WardenMobilityCoordinator(
      { decide: async () => ({ allowed: false, wardenDecisionRef: 'w-deny' }) },
      { execute: async (effect) => void effects.push(effect) },
    )
    const context = normalizeMobilityContext({
      observedAt: '2026-09-04T12:00:00.000Z', trafficState: 'DENSE',
    })
    await coordinator.recommendProfile(context, { allowContextRouting: true }, 'dm-session-1')
    expect(effects).toEqual([])
  })

  it('urgent ADAS may request media ducking but never vehicle actuation', async () => {
    const effects: string[] = []
    const coordinator = new WardenMobilityCoordinator(
      { decide: async () => ({ allowed: true, wardenDecisionRef: 'w-allow' }) },
      { execute: async (effect) => void effects.push(effect) },
    )
    const context = normalizeMobilityContext({
      observedAt: '2026-09-04T12:00:00.000Z', adasPriority: 'URGENT',
    })
    await coordinator.handleUrgentAdas(context, 'dm-session-1')
    expect(effects).toEqual(['DUCK_MEDIA'])
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/wardenfm/__tests__/mobility-coordinator.test.ts --runInBand
```

- [ ] **Step 3: Implement a non-safety effect port and coordinator**

```ts
import type { MobilityContextSnapshot } from './context'
import { recommendContextMediaProfile, type ContextMediaPreferences, type ContextMediaProfile } from './media-router'
import type { MobilityEffect, WardenMobilityAdmissionPort } from './admission'

export interface MobilityEffectPort {
  execute(effect: MobilityEffect, data?: Record<string, unknown>): Promise<void>
}

export class WardenMobilityCoordinator {
  public constructor(
    private readonly warden: WardenMobilityAdmissionPort,
    private readonly effects: MobilityEffectPort,
  ) {}

  public async requestEffect(
    effect: MobilityEffect,
    purpose: string,
    digitalMeSessionRef: string,
    data?: Record<string, unknown>,
  ): Promise<boolean> {
    const decision = await this.warden.decide({ effect, purpose, digitalMeSessionRef })
    if (!decision.allowed) return false
    await this.effects.execute(effect, data)
    return true
  }

  public async recommendProfile(
    context: MobilityContextSnapshot,
    preferences: ContextMediaPreferences,
    digitalMeSessionRef: string,
  ): Promise<ContextMediaProfile> {
    const profile = recommendContextMediaProfile(context, preferences)
    if (profile === 'USER_DEFAULT') return profile
    await this.requestEffect(
      'APPLY_CONTEXT_PROFILE',
      'driver-context-media-routing',
      digitalMeSessionRef,
      { profile },
    )
    return profile
  }

  public async handleUrgentAdas(
    context: MobilityContextSnapshot,
    digitalMeSessionRef: string,
  ): Promise<boolean> {
    if (context.adasPriority !== 'URGENT') return false
    return this.requestEffect('DUCK_MEDIA', 'adas-distraction-reduction', digitalMeSessionRef)
  }
}
```

- [ ] **Step 4: Add an explicit static test that mobility effect vocabulary contains no actuation effects**

```ts
it('exposes no safety-critical vehicle actuation effect', () => {
  const forbidden = ['STEER', 'BRAKE', 'THROTTLE', 'AEB', 'ACC', 'CAN_WRITE']
  const source = require('fs').readFileSync(require.resolve('../mobility/admission'), 'utf8')
  for (const term of forbidden) expect(source).not.toContain(`'${term}'`)
})
```

- [ ] **Step 5: Run tests and commit**

```bash
bunx jest src/wardenfm/__tests__/mobility-coordinator.test.ts --runInBand
bunx jest src/wardenfm/__tests__ --runInBand
git add src/wardenfm/mobility/coordinator.ts src/wardenfm/__tests__/mobility-coordinator.test.ts
git commit -m "feat: add Warden mobility coordinator"
```

---

### Task 7: Bind Admitted Mobility Effects to the Existing Playback Surface Without Moving Authority

**Files:**
- Modify: `src/wardenfm/playback-gate.ts`
- Modify: `src/wardenfm/runtime.ts`
- Modify: `src/wardenfm/__tests__/playback-gate.test.ts`
- Modify: `.github/workflows/build-android.yml`

**Interfaces:**
- Consumes: existing `WardenFmPlayerPort`, `WardenFmVehicleSession`, R0.2 `MobilityEffectPort`
- Produces: `createMobilityPlaybackEffectPort()` that maps only admitted non-safety effects onto existing media operations

- [ ] **Step 1: Write failing playback integration tests**

Add to `playback-gate.test.ts`:

```ts
import { createMobilityPlaybackEffectPort } from '../playback-gate'

it('maps admitted DUCK_MEDIA to pause without adding vehicle authority', async () => {
  const player = makePlayer()
  const port = createMobilityPlaybackEffectPort(player.port)
  await port.execute('DUCK_MEDIA')
  expect(player.calls).toEqual(['pause'])
})

it('rejects unsupported mobility effects at the playback boundary', async () => {
  const player = makePlayer()
  const port = createMobilityPlaybackEffectPort(player.port)
  await expect(port.execute('STEER' as never)).rejects.toThrow('Unsupported mobility playback effect')
  expect(player.calls).toEqual([])
})
```

- [ ] **Step 2: Verify RED**

```bash
bunx jest src/wardenfm/__tests__/playback-gate.test.ts --runInBand
```

- [ ] **Step 3: Add the narrow effect adapter**

Append to `src/wardenfm/playback-gate.ts`:

```ts
import type { MobilityEffect } from './mobility/admission'
import type { MobilityEffectPort } from './mobility/coordinator'

export function createMobilityPlaybackEffectPort(player: WardenFmPlayerPort): MobilityEffectPort {
  return {
    async execute(effect: MobilityEffect) {
      switch (effect) {
        case 'DUCK_MEDIA':
        case 'PAUSE_MEDIA':
          await player.pause()
          return
        case 'RESUME_MEDIA':
          await player.play()
          return
        case 'NEXT_MEDIA':
          await player.skipToNext()
          return
        case 'PREVIOUS_MEDIA':
          await player.skipToPrevious()
          return
        case 'APPLY_CONTEXT_PROFILE':
        case 'VOICE_EXPLANATION':
        case 'DIGITAL_MIRROR_GRANT':
          return
        default:
          throw new Error('Unsupported mobility playback effect')
      }
    },
  }
}
```

Do not add any vehicle-control API to `WardenFmPlayerPort`.

- [ ] **Step 4: Keep runtime construction dependency-injected**

Modify `src/wardenfm/runtime.ts` only to export a factory; do not create a fake Warden authority implementation:

```ts
import { WardenMobilityCoordinator, type MobilityEffectPort } from './mobility/coordinator'
import type { WardenMobilityAdmissionPort } from './mobility/admission'

export function createWardenMobilityCoordinator(
  warden: WardenMobilityAdmissionPort,
  effects: MobilityEffectPort,
): WardenMobilityCoordinator {
  return new WardenMobilityCoordinator(warden, effects)
}
```

- [ ] **Step 5: Ensure CI discovers every current and future WardenFM test**

The workflow test command must remain directory-based:

```yaml
- name: 🛡 Run WardenFM contract tests
  run: bunx jest src/wardenfm/__tests__ --runInBand
```

Do not replace it with an enumerated file list.

- [ ] **Step 6: Run the full portable verification gate**

```bash
bunx jest src/wardenfm/__tests__ --runInBand
bunx tsc --noEmit
```

Expected: all R0.1 and R0.2 tests PASS; no TypeScript errors.

- [ ] **Step 7: Commit Task 7**

```bash
git add src/wardenfm/playback-gate.ts src/wardenfm/runtime.ts src/wardenfm/__tests__/playback-gate.test.ts .github/workflows/build-android.yml
git commit -m "feat: bind admitted mobility effects to WardenFM playback"
```

---

### Task 8: Run R0.2 Acceptance Verification and Record Release Posture

**Files:**
- Create: `docs/verification/wardenfm-mobility-r0.2-portable-verification.md`
- Do not modify native Android/AAOS speech/camera/OEM adapters in this task.

**Interfaces:**
- Consumes: all R0.1 + R0.2 portable modules and tests
- Produces: a reviewable evidence record labeled `PORTABLE_CONTRACT_IMPLEMENTED` or `NATIVE_QUALIFICATION_PENDING`

- [ ] **Step 1: Run the full WardenFM test suite**

```bash
bunx jest src/wardenfm/__tests__ --runInBand
```

Record exact suite/test/pass/fail counts.

- [ ] **Step 2: Run TypeScript verification**

```bash
bunx tsc --noEmit
```

Record exit status and any diagnostics.

- [ ] **Step 3: Verify hard-denied/forbidden strings remain bounded**

```bash
git grep -n -E "ADB_EXECUTION|adb_execution|STEER|BRAKE|THROTTLE|CAN_WRITE|biometricTemplate|rawFrame" -- src/wardenfm
```

Inspect every match. Acceptable matches are denial tests, type guards, privacy guards, and documentation. No executable safety-actuation path is permitted.

- [ ] **Step 4: Check the implementation against all fourteen spec acceptance criteria**

The verification document must contain this exact checklist with PASS/BLOCKED status:

```text
1. R0.1 tests pass and ADB remains hard-denied.
2. MobilityContextSnapshot preserves unknown facts.
3. Media routing is deterministic and bounded.
4. ADAS_PRIORITY overrides ordinary routing.
5. Voice output is bounded and low-confidence input yields NO_ACTION.
6. Gesture output is bounded and carries no raw frame.
7. Voice/gesture cannot establish identity or self-authorize.
8. Step-up confirmation requires trusted DigitalMe session context.
9. Mobility grants carry purpose/time/expiry/Warden/River refs.
10. Expired/revoked grants stop authorizing.
11. Urgent ADAS can request duck/pause only; no actuation exists.
12. Mobility governance transitions have River-compatible evidence types.
13. Evidence privacy guard rejects raw media/biometric/secret fields.
14. Native Android/vehicle qualification remains pending until a real build/device/OEM evidence run occurs.
```

- [ ] **Step 5: Set release posture**

Use:

```markdown
**Portable contract state:** PORTABLE_CONTRACT_IMPLEMENTED
**Native Android/vehicle state:** NATIVE_QUALIFICATION_PENDING
**Authority:** WARDEN_EXTERNAL_TO_MOBILITY_PACKAGE
**ADAS actuation:** NOT_IMPLEMENTED / OUT_OF_SCOPE
**ADB execution:** HARD_DENIED
**Autolink:** PROBE_ONLY
```

If any portable test or typecheck fails, use `PORTABLE_CONTRACT_INCOMPLETE` instead.

- [ ] **Step 6: Commit the verification record**

```bash
git add docs/verification/wardenfm-mobility-r0.2-portable-verification.md
git commit -m "docs: record WardenFM mobility R0.2 portable verification"
```

---

## Plan Self-Review

### Spec coverage

- Context normalization: Task 1.
- Deterministic context-media routing and ADAS/NAV priority: Tasks 1 and 6.
- Bounded voice intent: Task 2.
- Bounded local gesture tokens and step-up semantics: Task 3.
- Digital Mirror progression, expiry, revocation: Task 4.
- River event vocabulary and privacy exclusion: Task 5.
- Warden remains authority and every effect requires admission: Tasks 2 and 6.
- Urgent ADAS can only produce non-actuating media effects: Tasks 6 and 7.
- Existing R0.1 ADB/Autolink boundaries remain unchanged: global constraints and Task 8.
- Native qualification remains a separate gate: Task 8.

### Placeholder scan

No `TBD`, `TODO`, implicit “implement later,” or unspecified error-handling steps remain. Native speech/camera/AAOS/OEM adapters are explicitly deferred by the approved spec rather than left unspecified.

### Type consistency

- `MobilityEffect` is defined once in `admission.ts` and consumed by coordinator/playback adapter.
- `WardenMobilityAdmissionPort` is defined in `admission.ts` and injected into the coordinator/runtime factory.
- `ContextMediaProfile` and preferences originate in `media-router.ts`.
- Voice and gesture normalize to bounded tokens before they can reach admission.
- Digital Mirror state never substitutes for a Warden decision.
