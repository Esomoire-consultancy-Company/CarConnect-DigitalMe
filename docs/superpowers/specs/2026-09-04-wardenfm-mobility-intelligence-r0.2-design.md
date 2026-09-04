# WardenFM Mobility Intelligence R0.2 — Design Specification

**Product:** `WARDENFM-VSR-001`  
**Work package:** `WARDEN-FM-MOBILITY-INTELLIGENCE-002 R0.2`  
**Date:** 2026-09-04  
**Status:** Design frozen for review  
**Supersedes:** Nothing. This is additive to `WARDEN-FM-VEHICLE-CONNECTOR-001 R0.1`.

## 1. Purpose

Extend the existing WardenFM vehicle connector from a governed media-control boundary into a driver-context orchestration layer that can:

1. accept purpose-bound voice intents related to driving context and WardenFM;
2. consume read-only traffic/route/vehicle/ADAS observations when technically available;
3. route WardenFM programmes and music profiles based on context without replacing OEM safety systems;
4. recognize a small deterministic gesture vocabulary locally;
5. use voice/gesture as intent and step-up confirmation signals under Warden, never as authority by themselves; and
6. progress a Digital Mirror mobility state so additional non-safety capabilities can be unlocked through explicit, scoped, expiring Warden grants with River evidence.

R0.2 must preserve the R0.1 rule that technical availability never equals authorization.

## 2. System boundary

```text
DigitalMe / trusted device-session identity
        ↓
Digital Mirror mobility state
        ↓
Warden capability + consent policy
        ↓
Mobility Context Engine
   ├── Voice intent adapter
   ├── Traffic/route context adapter
   ├── Read-only ADAS observation adapter
   ├── Gesture token adapter
   └── Driver preference adapter
        ↓
Warden decision / step-up confirmation
        ↓
Permitted effects
   ├── WardenFM programme selection
   ├── music-context profile selection
   ├── duck / pause / resume
   ├── voice explanation
   └── Digital Mirror non-safety capability progression
        ↓
RiverOS evidence + effect verification
```

Warden remains the authority controller. DigitalMe remains the principal. The Digital Mirror is a contextual capability twin, not the source of authority. WardenFM remains an execution/orchestration surface. RiverOS remains evidence.

## 3. Non-negotiable authority and safety rules

- Voice input expresses intent; it does not grant authority.
- Gesture input expresses intent or step-up confirmation; it does not establish identity by itself.
- Camera and microphone activation require explicit, purpose-bound Warden admission.
- No covert microphone, camera, or background biometric capture.
- Raw camera frames are not retained by default. Gesture processing should emit a bounded gesture token and discard the frame.
- No face recognition requirement in R0.2.
- No hand-shape biometric identification in R0.2.
- No emotion inference from voice, face, driving behavior, or gesture.
- OEM/vehicle ADAS warnings remain authoritative for vehicle safety presentation. Warden may prioritize, duck media, or explain an observed warning but must not decide whether the OEM warning should exist.
- No steering, braking, throttle, lane-centering, AEB, ACC actuation, CAN-bus actuation, or other safety-critical vehicle control.
- `ADB_EXECUTION` remains hard-denied.
- Autolink remains probe-only.
- No shell execution, package installation, firmware modification, touch injection, or USB-debug enablement through R0.2.
- No capture or rebroadcast of third-party music streams.
- No provider credentials or other secrets in Digital Mirror or River payloads.
- All new capability grants are scoped, effective-dated, expiring, revocable, and evidence-linked.

## 4. Component model

### 4.1 `MobilityContextSnapshot`

A normalized read-only context object consumed by all R0.2 policy modules.

```ts
export type MobilityTrafficState =
  | 'UNKNOWN'
  | 'FREE_FLOW'
  | 'MODERATE'
  | 'DENSE'
  | 'STOP_START';

export type MobilityRouteComplexity = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH';

export type AdasPriority = 'NONE' | 'INFORMATION' | 'CAUTION' | 'URGENT';

export type MobilityContextSnapshot = {
  observedAt: string;
  trafficState: MobilityTrafficState;
  routeComplexity: MobilityRouteComplexity;
  tripPhase: 'UNKNOWN' | 'DEPARTURE' | 'CRUISE' | 'APPROACH' | 'ARRIVAL';
  speedVarianceBand: 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH';
  adasPriority: AdasPriority;
  sourceRefs: string[];
};
```

No field in the snapshot implies authority. Unknown values must remain explicit rather than guessed.

### 4.2 `WardenVoiceIntent`

R0.2 supports a bounded intent grammar rather than unrestricted command execution.

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
  | 'CANCEL';
```

Voice parsing must return an intent token plus confidence and source/session references. A low-confidence or unsupported result must fail closed to `NO_ACTION` and may ask for confirmation through the user-visible interaction surface.

### 4.3 `WardenGestureToken`

Initial deterministic gesture vocabulary:

```ts
export type WardenGestureToken =
  | 'PALM_STOP'
  | 'SWIPE_RIGHT'
  | 'SWIPE_LEFT'
  | 'THUMBS_UP'
  | 'CLOSED_HAND_CANCEL'
  | 'POINT_HOLD_CONFIRM'
  | 'UNKNOWN';
```

Default mapping:

- `PALM_STOP` → request pause/stop intent;
- `SWIPE_RIGHT` → request next-media intent;
- `SWIPE_LEFT` → request previous-media intent;
- `THUMBS_UP` → confirm a pending non-safety Warden decision;
- `CLOSED_HAND_CANCEL` → cancel current pending intent;
- `POINT_HOLD_CONFIRM` → confirm a currently selected non-safety action;
- `UNKNOWN` → no action.

Gesture recognition must be local-first and return only the token, confidence, timestamp, and source/session reference to the Warden layer. Raw video is not part of the River evidence envelope.

### 4.4 `ContextMediaProfileRouter`

The router must select a bounded profile, not autonomously pick arbitrary tracks.

```ts
export type ContextMediaProfile =
  | 'FOCUS_LOW_COMPLEXITY'
  | 'CRUISE'
  | 'ENERGY'
  | 'CALM'
  | 'WARDEN_BRIEFING'
  | 'NAV_PRIORITY'
  | 'ADAS_PRIORITY'
  | 'USER_DEFAULT';
```

Inputs:

- `MobilityContextSnapshot`;
- DigitalMe media preferences already admitted for this purpose;
- current WardenFM programme/profile;
- active Warden decisions.

Priority rules:

1. `ADAS_PRIORITY` overrides all other media-profile routing when `adasPriority === 'URGENT'`.
2. `NAV_PRIORITY` may override genre/profile changes when route complexity is high.
3. `FOCUS_LOW_COMPLEXITY` may be selected for dense/stop-start traffic when permitted by user preferences.
4. `CRUISE`, `ENERGY`, or `CALM` may be selected only when no higher-priority safety/distraction rule applies.
5. `USER_DEFAULT` is the fallback when context is unknown or routing is not admitted.

The router may recommend a profile. Warden must admit the playback effect before WardenFM executes it.

### 4.5 `DigitalMirrorMobilityState`

Digital Mirror mobility progression is modeled as explicit evidence-backed state, not an implicit score.

```ts
export type MobilityProgressState =
  | 'SESSION_BOUND'
  | 'CONTEXT_KNOWN'
  | 'WARDEN_ADMITTED'
  | 'VOICE_AVAILABLE'
  | 'GESTURE_AVAILABLE'
  | 'MEDIA_PROFILE_ACTIVE'
  | 'ROUTINE_ESTABLISHED';

export type MobilityCapabilityGrant = {
  grantId: string;
  digitalMeId: string;
  vehicleRelationshipRef: string;
  capability: string;
  purpose: string;
  effectiveFrom: string;
  expiresAt: string;
  wardenDecisionRef: string;
  riverEvidenceRef: string;
};
```

Progression does not permanently elevate the actor. Every unlocked capability must be represented by a grant and re-evaluated when context, device trust, vehicle relationship, purpose, or consent changes.

A gesture or voice confirmation can satisfy a Warden step-up challenge only after DigitalMe identity/session and the requested capability are already known.

## 5. Priority and interruption model

R0.2 uses the following execution priority from highest to lowest:

```text
OEM / vehicle safety warning
→ Warden ADAS_PRIORITY response
→ navigation / route-complexity priority
→ explicit driver voice/gesture intent
→ WardenFM programme routing
→ contextual genre/profile recommendation
→ background personalization
```

For an urgent observed ADAS event, the permitted Warden response is limited to non-actuating effects such as:

- immediately duck or pause WardenFM if already admitted;
- present an already-available OEM warning without suppressing it;
- issue an optional concise voice explanation when permitted;
- log the context, Warden decision, effect request, and observed effect to RiverOS.

R0.2 must never place AI reasoning between the OEM safety system and its required warning presentation.

## 6. Voice flow

```text
Purpose-bound microphone admission
→ speech-to-intent adapter
→ bounded WardenVoiceIntent
→ confidence/policy check
→ Warden capability decision
→ optional gesture/voice step-up confirmation
→ WardenFM or Digital Mirror effect
→ River receipt
→ effect verification
```

Unsupported or low-confidence speech results in no action.

## 7. Gesture flow

```text
Purpose-bound camera admission
→ local hand-landmark/gesture processing
→ WardenGestureToken
→ raw frame discarded
→ intent/confirmation mapping
→ Warden policy decision
→ permitted non-safety effect
→ River receipt
→ effect verification
```

No gesture may trigger vehicle actuation in R0.2.

## 8. Context-media flow

```text
context adapters
→ MobilityContextSnapshot
→ deterministic ContextMediaProfileRouter
→ recommended ContextMediaProfile
→ preference/purpose check
→ Warden admission
→ WardenFM programme/profile transition
→ River evidence
```

The router must be deterministic for the same normalized inputs and policy version. Any ML-based recommendation added later must remain advisory and resolve to the same bounded profile vocabulary before Warden evaluation.

## 9. RiverOS evidence spine

Additive R0.2 event types:

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
  | 'MOBILITY_EFFECT_VERIFIED';
```

Evidence envelopes may include normalized tokens, policy/version references, Warden decision references, and effect results. They must not include raw camera frames, continuous microphone recordings, provider secrets, or biometric templates.

## 10. Failure behavior

- Missing context adapter → context field remains `UNKNOWN`; do not infer.
- ADAS source unavailable → no ADAS claim; media system continues under ordinary WardenFM policy.
- Voice confidence below policy threshold → no action.
- Gesture confidence below policy threshold → `UNKNOWN`; no action.
- Warden unavailable or decision missing → fail closed for capability-changing effects.
- Digital Mirror grant expired/revoked → capability unavailable until re-admitted.
- River transport unavailable → queue bounded evidence locally under existing River rules; do not silently discard governance events.
- Camera/microphone permission absent → feature unavailable; no repeated coercive prompts.

## 11. R0.2 implementation slices

R0.2 should be implemented as four independently testable slices in this order:

1. **Context + media profile routing** — pure TypeScript normalized context, deterministic profile router, priority tests.
2. **Voice intent grammar** — pure TypeScript intent contract and admission bridge; microphone runtime remains adapter-specific.
3. **Gesture token grammar** — token contract and Warden step-up mapping first; vision provider remains behind an adapter.
4. **Digital Mirror mobility progression** — explicit state transitions, expiring capability grants, revocation, and River evidence.

Native Android/AAOS or camera/speech providers must not be introduced until the pure contracts and fail-closed behavior are test-covered.

## 12. Acceptance criteria

R0.2 is implementation-complete only when all of the following are demonstrated:

1. R0.1 tests remain passing with `ADB_EXECUTION` hard-denied.
2. A normalized `MobilityContextSnapshot` can represent unknown/traffic/route/ADAS context without inventing data.
3. The media router deterministically selects from the bounded profile vocabulary.
4. `ADAS_PRIORITY` overrides ordinary programme/genre routing.
5. Voice produces only bounded intent tokens and unsupported/low-confidence input cannot execute an effect.
6. Gesture produces only bounded local gesture tokens and raw frames are not retained in River payloads.
7. Gesture/voice cannot establish identity or self-authorize a capability.
8. A Warden step-up challenge can accept an admitted `THUMBS_UP`/`POINT_HOLD_CONFIRM` or supported voice confirmation only after a trusted DigitalMe session exists.
9. Digital Mirror capability grants contain purpose, scope, effective time, expiry, Warden decision reference, and River evidence reference.
10. Expired/revoked mobility grants stop authorizing their capability.
11. Urgent ADAS context can duck/pause WardenFM but cannot actuate the vehicle.
12. All new governance transitions emit ordered River evidence and effect verification where applicable.
13. No raw video, continuous microphone recording, biometric template, provider secret, or third-party stream appears in evidence payloads.
14. Android build/physical qualification remains a separate release gate; passing portable tests does not imply vehicle/OEM production qualification.

## 13. Explicitly deferred beyond R0.2

- steering/braking/throttle/ACC/AEB/lane-control actuation;
- CAN-bus write access;
- unrestricted natural-language execution;
- biometric identity from face, voiceprint, hand shape, or gesture;
- emotion classification;
- cloud retention of raw in-cabin audio/video;
- autonomous arbitrary track selection outside the bounded media-profile vocabulary;
- Autolink privileged execution;
- production OEM ADAS integration claims without vehicle-specific permission and hardware evidence.

## 14. Release posture

Until native Android/vehicle qualification is completed, R0.2 must be labeled `PORTABLE_CONTRACT_IMPLEMENTED` or `NATIVE_QUALIFICATION_PENDING`, never production-qualified. Warden, DigitalMe, RiverOS, and vehicle/OEM boundaries remain explicit in every acceptance record.
