# WardenFM Mobility Intelligence R0.2 — Amendment A

**Date:** 2026-09-04  
**Scope:** Additive clarification to `2026-09-04-wardenfm-mobility-intelligence-r0.2-design.md`  
**Authority impact:** None  
**Supersession:** Does not supersede the R0.2 design; clarifies evidence and fail-closed token semantics discovered during implementation.

## 1. Mobility effect admission evidence

Add the following River event type to the R0.2 evidence vocabulary:

```ts
'MOBILITY_EFFECT_ADMISSION_DECIDED'
```

Purpose: record the external Warden admission decision for a requested non-safety mobility effect before execution. The event carries the effect name, purpose, boolean decision, and `wardenDecisionRef`. A denied decision produces no execution effect.

This does not move Warden authority into WardenFM. The mobility coordinator remains a consumer of an injected `WardenMobilityAdmissionPort`.

## 2. Voice fail-closed token clarification

The actionable voice grammar and the normalized parser result are distinct types:

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

export type NormalizedVoiceIntent = WardenVoiceIntent | 'NO_ACTION';
```

`NO_ACTION` is therefore part of the bounded normalized voice result vocabulary but is deliberately not an executable `WardenVoiceIntent`. Low-confidence or unsupported provider output must normalize to `NO_ACTION`, which cannot request an effect or authorize a capability.

## 3. Semantic token privacy clarification

The original design permits normalized voice/gesture tokens in River evidence while prohibiting provider secrets and biometric/raw-media material. Therefore the privacy guard distinguishes:

**Allowed semantic evidence keys:**
- `gestureToken`
- `voiceIntentToken`

**Forbidden secret/raw/biometric classes:**
- raw camera frames;
- continuous/raw audio recordings;
- voiceprints;
- biometric templates;
- provider secrets;
- passwords/credentials;
- access tokens;
- provider tokens;
- refresh tokens.

A generic substring ban on the word `token` is invalid because it would also reject the approved semantic gesture/voice tokens.

## 4. Ordered evidence spine

R0.2 implementation adds `MobilityEvidenceSpine` with:

- append-only internal storage;
- immutable caller snapshots;
- session-local `priorEventRef` chaining;
- privacy validation before append;
- injectable clock and event-ID factory for deterministic tests.

The coordinator uses this spine to record context, profile recommendations, Warden admission decisions, verified effects, normalized voice/gesture observations, and step-up events. Digital Mirror mobility state may be bound to the same spine to record progression, grant, and revocation transitions.

## 5. Unchanged constraints

All original R0.2 authority and safety constraints remain unchanged, including:

- `ADB_EXECUTION` hard-denied;
- Autolink probe-only;
- no vehicle safety actuation;
- no identity from gesture/voice alone;
- no raw camera/audio retention in River evidence;
- native Android/OEM qualification remains a separate release gate.
