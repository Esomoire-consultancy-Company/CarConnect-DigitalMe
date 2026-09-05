# Warden Capability License Contract R0.1 — Portable Verification

**Contract:** `WARDEN-CAPABILITY-LICENSE-CONTRACT-R0.1`  
**Date:** 2026-09-05  
**Branch:** `feature/warden-capability-license-r0.1`  
**Spec:** `docs/superpowers/specs/2026-09-05-warden-capability-license-contract-r0.1-design.md`  
**Plan:** `docs/superpowers/plans/2026-09-05-warden-capability-license-contract-r0.1.md`

## Release posture

```text
Contract state: PORTABLE_CONTRACT_PARTIALLY_VERIFIED
Authority: WARDEN_EXTERNAL
Registry authority: GENESIS
Evidence: RIVER
Operator: SYNNERGYZE_NO_AUTHORITY
First profile: WARDEN_MOBILITY
Safety-critical vehicle actuation: NON_LICENSABLE
ADB execution: NON_LICENSABLE / HARD_DENIED
Autolink privileged execution: NON_LICENSABLE / PROBE_ONLY
```

`PORTABLE_CONTRACT_IMPLEMENTED` is deliberately not claimed because the repository's formal Jest/typecheck/CI gate has not run on this branch.

## Verification evidence

### Portable behavior harness

A local Node 22 TypeScript strip-types harness executed the same R0.1 production contracts against ten test groups. All groups exited successfully.

| Group | Assertions |
|---|---:|
| Registry contracts | 3 |
| Licence validation | 8 |
| Context constraints | 4 |
| External entitlements | 6 |
| Deterministic evaluator | 10 |
| External Warden boundary | 3 |
| River-compatible evidence spine | 9 |
| Warden Mobility profile | 11 |
| DigitalMe Card projection | 6 |
| Public package exports | 5 |
| **Total** | **65** |

### Standalone TypeScript compile

The portable production mirror compiled successfully with:

```text
tsc 5.8.3
--noEmit
--module esnext
--moduleResolution bundler
--target es2022
```

This is useful portable evidence, but it is not substituted for the repository's own TypeScript version/configuration gate.

### Forbidden-capability scan

Production matches for:

```text
VEHICLE_STEER
VEHICLE_BRAKE
VEHICLE_THROTTLE
VEHICLE_AEB_CONTROL
VEHICLE_ACC_CONTROL
VEHICLE_CAN_WRITE
ADB_EXECUTION
AUTOLINK_PRIVILEGED_EXECUTION
```

were limited to the eight Warden Mobility Effect Registry definitions, each with `licensable: false`. Additional matches occur only in deny/validation tests. No execution adapter for any of these effects exists in `src/warden/capability-license/`.

## Formal repository CI status

**Status: BLOCKED / NOT RUN**

GitHub Actions reports zero workflow runs for `feature/warden-capability-license-r0.1` at verification time.

The existing `.github/workflows/build-android.yml` does not cover this kernel:

- pull-request paths include `src/wardenfm/**` and `src/player/**`, but not `src/warden/**`;
- the Jest step runs only `bunx jest src/wardenfm/__tests__ --runInBand`;
- therefore the new `src/warden/capability-license/__tests__` suite is not part of the existing automatic gate.

Required future formal gate:

```bash
bunx jest src/warden/capability-license/__tests__ --runInBand
bunx jest src/wardenfm/__tests__ src/warden/capability-license/__tests__ --runInBand
bunx tsc --noEmit
```

A CI workflow must also include `src/warden/**` before branch CI can be treated as authoritative evidence for this package.

## Approved acceptance criteria

| # | Criterion | Portable status | Evidence |
|---|---|---|---|
| 1 | Global non-licensable effects/capabilities cannot be granted | PASS | Registry and licence validators reject non-licensable effects; evaluator independently denies a malformed grant requesting `VEHICLE_STEER`. |
| 2 | Principal and relationship mismatches fail closed | PASS | Evaluator returns `PRINCIPAL_MISMATCH` / `RELATIONSHIP_MISMATCH`. |
| 3 | Draft, future, suspended, expired, or revoked licences deny | PASS | Evaluator lifecycle/time precedence denies non-active/future/expired/revoked state; Card keeps draft/future envelope-only and revoked/expired non-executable. |
| 4 | Purpose is mandatory and allowlisted | PASS | Licence compilation rejects purpose broadening; evaluator denies non-allowlisted purpose. |
| 5 | Input data checked against registry and licence allow/prohibit | PASS | Licence compilation prevents data-envelope broadening; evaluator checks prohibit before allow. |
| 6 | Effects checked against registry licensability and licence allow/prohibit | PASS | Global registry `licensable: false` wins before grant allow; explicit prohibits precede allow. |
| 7 | Required entitlement missing/UNKNOWN/invalid/expired denies | PASS | All four states covered; entitlement assertion is also bound to requesting principal and capability. |
| 8 | Context uses bounded grammar and missing required context denies | PASS | Only `EQ`, `NEQ`, `IN`, `NOT_IN`, `GTE`, `LTE`, `EXISTS`; invalid operator/value combinations rejected at licence validation. |
| 9 | Licence match cannot execute a deed; external Warden allow mandatory | PASS | Kernel only returns `MATCH`/`DENY`; external `WardenCapabilityAdmissionPort` is called only after `MATCH`. |
| 10 | Licence reason codes deterministic and evidence-safe | PASS | Evaluator returns a deterministic first fail-closed reason; evidence payload guard rejects raw/secret/biometric key classes recursively. |
| 11 | Lifecycle/supersession evidence-linked; history not silently rewritten | PASS (contract level) | Licence exposes `supersedesLicenceRef`; lifecycle event vocabulary is append-only in `CapabilityLicenseEvidenceSpine`; no in-place lifecycle persistence API is introduced by R0.1. |
| 12 | DigitalMe Card separates licence envelope from runtime availability | PASS | Card has no `allowedNow`; active capability shows Warden admission required, unresolved entitlement is explicit, draft/future is envelope-only. |
| 13 | Mobility cannot license steering/braking/throttle/AEB/ACC/CAN/ADB/Autolink privileged execution | PASS | All eight effects are present only as `licensable: false`; forbidden scan found no execution adapter. |
| 14 | Voice/gesture remain interaction/confirmation primitives, not identity/authority | PASS | Mobility profile admits only normalized `VOICE_INTENT_TOKEN` / `GESTURE_INTENT_TOKEN`; Warden authority remains external. |
| 15 | Kernel contains no provider credentials/raw camera/continuous raw audio/biometric templates | PASS | Runtime contracts carry class IDs only; restricted classes are non-admitted profile data; evidence guard rejects corresponding payload-key classes. |
| 16 | Mobility consumes kernel without duplicating licence semantics | PASS | `mobility-profile.ts` defines profile/ID mapping and licence factory only; generic evaluation remains in the kernel. |
| 17 | Every matched grant has stable `grantId` | PASS | Evaluator returns `matchedGrantRef`; duplicate grant IDs are rejected at licence validation. |
| 18 | External entitlement and Warden decision evidence separable from licence-match evidence | PASS | Separate entitlement, licence-match and Warden-decision event types; per-session append-only evidence chain. |

## Additional fail-closed corrections made during acceptance review

Three issues were found before verification was frozen and were corrected test-first:

1. licence compilation now rejects purpose broadening, capability-version mismatch, and invalid bounded context constraints;
2. requests must reference the evaluated licence, and entitlement assertions must match both the DigitalMe principal and requested capability;
3. DigitalMe Card draft/future licences remain `LICENSED_ENVELOPE` instead of appearing admission-ready.

## Remaining qualification work

1. Add formal CI coverage for `src/warden/**` and the capability-license Jest suite.
2. Run repository Jest plus repository `tsc --noEmit` using checked-in dependencies/configuration.
3. Run the combined WardenFM + capability-license regression gate.
4. Keep Android/Gradle/APK/device qualification separate; this generic portable contract does not make WardenFM native providers production-qualified.
5. Do not merge or promote based solely on this portable verification record.
