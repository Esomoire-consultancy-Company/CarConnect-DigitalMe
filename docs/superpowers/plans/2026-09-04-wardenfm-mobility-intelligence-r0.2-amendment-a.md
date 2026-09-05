# WardenFM Mobility Intelligence R0.2 Implementation Plan — Amendment A

**Applies to:** `2026-09-04-wardenfm-mobility-intelligence-r0.2.md`

This amendment records two corrections discovered during TDD execution.

## Evidence privacy correction

In Task 5, do **not** reject every key containing `token`. Normalized semantic keys such as `gestureToken` and `voiceIntentToken` are allowed. Reject raw media, biometrics, credentials, and secret-token classes such as `accessToken`, `providerToken`, and `refreshToken`.

## Ordered evidence completion

Task 5 additionally produces `MobilityEvidenceSpine`, an append-only session-local evidence chain with immutable snapshots.

Task 6 additionally records:

- `MOBILITY_CONTEXT_OBSERVED`;
- `CONTEXT_MEDIA_PROFILE_RECOMMENDED`;
- `MOBILITY_EFFECT_ADMISSION_DECIDED` with `wardenDecisionRef`;
- `MOBILITY_EFFECT_VERIFIED` after successful execution;
- `VOICE_INTENT_RECOGNIZED`;
- `GESTURE_TOKEN_RECOGNIZED`;
- step-up request and decision events.

Task 4 may bind `DigitalMirrorMobilityState` to the same evidence spine and record state change, grant, and revocation events.

All authority and safety constraints in the original plan remain unchanged.
