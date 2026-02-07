# Implementation Plan: Live Group Engagement Monitor — Device-Side System

**Branch**: `001-engagement-monitor` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-engagement-monitor/spec.md`

## Summary

Build a device-side engagement monitoring system on a Raspberry Pi 5 that uses a Teachable Machine TFLite model to classify behaviors in a seated group, computes a weighted engagement score per 5-second tick, and emits anonymized aggregate JSON metrics to Firebase Firestore. The system supports discrete sessions with start/end lifecycle, a terminal-based glanceable indicator, configurable scoring weights, and synthetic session generation for demo purposes.

## Technical Context

**Language/Version**: Python 3.11 (Bookworm default)  
**Primary Dependencies**: `tflite-runtime` (v2.14+), `picamera2` (via apt), `firebase-admin` (v7.x), `numpy`, `Pillow`  
**Storage**: Firebase Firestore (cloud), JSON config files (local)  
**Testing**: `pytest`, `jsonschema` for contract tests  
**Target Platform**: Raspberry Pi 5, Debian Bookworm ARM64, Pi Camera Module v2/v3  
**Project Type**: Single project (device-side only; frontend is separate)  
**Performance Goals**: ≥5 FPS inference, 5-second tick interval, <2GB RAM  
**Constraints**: ARM64/aarch64, no GPU, TFLite CPU-only inference, headless operation  
**Scale/Scope**: Single device, single camera, 1 session at a time, hackathon demo scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Live Student Engagement Monitor Constitution (v1.0.0):

- **Privacy-First**: ✅ No per-person data in any schema. BehaviorsSummary is aggregate counts only. No media fields in any contract. No face recognition, no identification.
- **Edge-First**: ✅ All inference via TFLite on Pi. Only JSON metric payloads transmitted to Firestore. Frames processed in-memory via picamera2, never persisted or transmitted.
- **Demo-Safe**: ✅ No room-specific configuration. Generic camera view of any seated group. Default weights work out of the box. Setup < 2 minutes.
- **Configurable Scoring**: ✅ `config/weights.json` defines all behavior weights externally. Validated on startup. No code changes needed to adjust scoring.
- **Clear Contracts**: ✅ Three versioned JSON schemas: metric-tick.v1, session-summary.v1, weight-config.v1. `schemaVersion` field in every emitted payload.
- **Simplicity**: ✅ Single Python process. TFLite for inference. Firestore for storage. Terminal ANSI for indicator. No web server, no microservices, no message broker.
- **Transparency**: ✅ Scoring formula: mean of per-person behavior weights, clamped [0,100]. Intermediate detection counts visible in behaviorsSummary. Debug logging of inference results.
- **Non-Goals**: ✅ No streaming, no recording, no individual tracking, no identification, no attendance. None present in any contract or data model.

**Status**: [x] PASS / [ ] NEEDS REVIEW / [ ] BLOCKED

*Post-design re-check (after Phase 1): ✅ PASS — no new violations introduced.*

## Project Structure

### Documentation (this feature)

```text
specs/001-engagement-monitor/
├── plan.md              # This file
├── research.md          # Phase 0: technology research & decisions
├── data-model.md        # Phase 1: entities, fields, relationships
├── quickstart.md        # Phase 1: setup & run instructions
├── contracts/           # Phase 1: JSON schemas
│   ├── metric-tick.v1.schema.json
│   ├── session-summary.v1.schema.json
│   └── weight-config.v1.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
device/
├── requirements.txt              # Python dependencies
├── config/
│   └── weights.json              # Behavior weights & scoring config (default)
├── model/
│   ├── model_unquant.tflite      # Teachable Machine TFLite export (not in git)
│   └── labels.txt                # Behavior class labels (not in git)
├── engagement_monitor/
│   ├── __init__.py
│   ├── main.py                   # Entry point — session loop, tick orchestration
│   ├── camera.py                 # picamera2 frame capture
│   ├── detector.py               # TFLite model loading & inference
│   ├── scorer.py                 # Behavior → engagement score calculation
│   ├── session.py                # Session lifecycle (start/end/state)
│   ├── emitter.py                # Firestore payload emission
│   ├── indicator.py              # Terminal glanceable display
│   ├── config.py                 # Weight config loading & validation
│   └── schemas.py                # Payload construction & schema version
├── synthetic/
│   ├── __init__.py
│   └── generator.py              # Synthetic session data generator
└── tests/
    ├── conftest.py               # Shared fixtures
    ├── contract/
    │   ├── test_metric_tick.py   # Validate tick payloads against JSON schema
    │   └── test_session_summary.py
    ├── unit/
    │   ├── test_scorer.py        # Scoring logic tests
    │   ├── test_config.py        # Config validation tests
    │   ├── test_session.py       # Session lifecycle tests
    │   └── test_detector.py      # Inference pipeline tests (mocked)
    └── integration/
        └── test_emitter.py       # Firestore write tests (mocked or emulator)
```

**Structure Decision**: Single project under `device/` directory at repository root. The frontend (`MacEngageFrontEnd/`) is a separate, pre-existing project. This device code is independent and deployable to the Pi without any coupling to the frontend build.

## Complexity Tracking

> No violations — Constitution Check passed both pre- and post-design. No entries needed.
