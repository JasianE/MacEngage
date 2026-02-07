# Tasks: Live Group Engagement Monitor — Device-Side System

**Input**: Design documents from `/specs/001-engagement-monitor/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All file paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `device/` project skeleton, install dependencies, and establish the package structure

- [X] T001 Create project directory structure per plan.md layout under `device/`
- [X] T002 Create `device/requirements.txt` with pinned dependencies: `tflite-runtime>=2.14`, `firebase-admin>=7.0`, `numpy<2`, `Pillow`, `jsonschema`
- [X] T003 [P] Create `device/engagement_monitor/__init__.py` with package metadata (version, schema version constant `SCHEMA_VERSION = "1.0.0"`)
- [X] T004 [P] Create `device/synthetic/__init__.py` as empty package init
- [X] T005 [P] Create `device/.gitignore` to exclude `.venv/`, `model/*.tflite`, `config/service-account-key.json`, `__pycache__/`
- [X] T006 [P] Copy JSON schema files from `specs/001-engagement-monitor/contracts/` to `device/schemas/` for runtime validation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules that ALL user stories depend on — config loading, payload construction, and Firestore emission

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create default `device/config/weights.json` with all 8 behavior weights, `confidenceThreshold: 0.6`, and `tickIntervalSeconds: 5` per weight-config.v1 schema
- [X] T008 Implement config loader and validator in `device/engagement_monitor/config.py` — load `weights.json`, validate against weight-config.v1 schema using `jsonschema`, fall back to hardcoded defaults if file missing, reject invalid configs with logged error
- [X] T009 [P] Implement payload builder in `device/engagement_monitor/schemas.py` — functions `build_tick_payload()` and `build_summary_payload()` that construct dicts conforming to metric-tick.v1 and session-summary.v1 schemas, always include `schemaVersion`
- [X] T010 [P] Implement Firestore emitter in `device/engagement_monitor/emitter.py` — initialize `firebase-admin` with service account credentials from `GOOGLE_APPLICATION_CREDENTIALS` env var, provide `emit_tick(payload)` to write to `sessions/{sessionId}/ticks/`, `emit_session(payload)` to write/update `sessions/{sessionId}`, and `emit_summary(sessionId, summary)` to update the session document with the summary

**Checkpoint**: Config loading, payload construction, and Firestore writes are all operational

---

## Phase 3: User Story 1 — Real-Time Engagement Monitoring (Priority: P1) 🎯 MVP

**Goal**: Device captures frames, runs TFLite inference to detect behaviors, computes engagement score, emits JSON tick payloads to Firestore, and displays a glanceable terminal indicator — all within a 5-second tick loop

**Independent Test**: Start a session, point at a group (or use a test image), confirm tick payloads appear in Firestore with valid schema, and the terminal shows a color-coded engagement bar

### Implementation

- [X] T011 [P] [US1] Implement camera capture in `device/engagement_monitor/camera.py` — wrap `picamera2` with `create_preview_configuration` at 640×480 RGB888, provide `capture_frame()` returning numpy RGB array, `start()`/`stop()` lifecycle methods
- [X] T012 [P] [US1] Implement TFLite detector in `device/engagement_monitor/detector.py` — load `model/model_unquant.tflite` and `model/labels.txt`, provide `detect(frame) -> list[tuple[str, float]]` that resizes frame to 224×224, normalizes to [-1,1], runs inference, returns list of `(behavior_label, confidence)` pairs above the configured confidence threshold
- [X] T013 [US1] Implement engagement scorer in `device/engagement_monitor/scorer.py` — provide `compute_score(detections, weights) -> tuple[int, dict]` that takes a list of `(behavior_label, confidence)` detections and weight config, counts behaviors into a BehaviorsSummary dict, computes mean of per-person weights, clamps to [0,100], returns `(engagementScore, behaviorsSummary)`
- [X] T014 [P] [US1] Implement terminal indicator in `device/engagement_monitor/indicator.py` — provide `show(score: int)` that prints a single-line ANSI color-coded bar (green ≥70, yellow ≥40, red <40) with numeric score, using `\r` carriage return for in-place updates
- [X] T015 [US1] Implement main tick loop in `device/engagement_monitor/main.py` — on startup: load config (T008), initialize camera (T011), load detector (T012), initialize emitter (T010); provide `run_session(session_id, device_id)` that every `tickIntervalSeconds`: captures frame → detects behaviors → computes score → builds tick payload (T009) → emits to Firestore (T010) → updates indicator (T014); accept keyboard input: `s` to start session, `e` to end session, `q` to quit
- [X] T016 [US1] Wire up `device/engagement_monitor/__main__.py` entry point so `python -m engagement_monitor` launches `main.py` with device ID from environment variable `DEVICE_ID` (default: hostname)

**Checkpoint**: A single session can be started, runs tick loop with live camera inference, emits valid payloads to Firestore, and shows terminal indicator. User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 — Session Lifecycle Management (Priority: P2)

**Goal**: Formalize session start/end with unique IDs, state enforcement (no overlapping sessions), and a session summary emitted on end

**Independent Test**: Start a session, run for several ticks, end it, verify Firestore contains the session document with summary (duration, average engagement, tick count, timeline reference)

### Implementation

- [X] T017 [US2] Implement session state manager in `device/engagement_monitor/session.py` — provide `SessionManager` class with `start_session(device_id) -> Session` (generates UUID, records start time, sets status active), `end_session() -> SessionSummary` (computes duration, average engagement from accumulated scores, tick count, timeline ref `sessions/{sid}/ticks`), `is_active -> bool`, and guard that raises error if starting while active
- [X] T018 [US2] Integrate SessionManager into `device/engagement_monitor/main.py` — replace inline session handling with `SessionManager`, accumulate tick scores for summary computation, on `e` command: call `end_session()`, build summary payload (T009), emit summary to Firestore (T010), print summary to terminal
- [X] T019 [US2] Add session document creation on start in `device/engagement_monitor/emitter.py` — on session start, write a session document to `sessions/{sessionId}` with `deviceId`, `startedAt`, `status: "active"`, `endedAt: null`; on session end, update with `endedAt`, `status: "completed"`, and embedded `summary`

**Checkpoint**: Sessions have formal start/end, unique IDs, overlap prevention, and a summary written to Firestore. User Stories 1 AND 2 are both independently functional.

---

## Phase 5: User Story 3 — Configurable Behavior Weights (Priority: P3)

**Goal**: Weights are loaded from `config/weights.json` at startup and applied to scoring; invalid configs are rejected with fallback to defaults

**Independent Test**: Edit `config/weights.json` (e.g., set `writing_notes` to 50), start a session, verify scores reflect the change; provide invalid JSON, verify device falls back to defaults and logs a warning

### Implementation

- [X] T020 [US3] Enhance config validation in `device/engagement_monitor/config.py` — add `reload_config()` method that re-reads `weights.json` from disk, validates against schema, and returns `(config, errors)` tuple; if invalid, return previous valid config and log each validation error with field-level detail
- [X] T021 [US3] Integrate config reload at session start in `device/engagement_monitor/main.py` — before each `start_session()`, call `reload_config()` so weight changes take effect on next session without restarting the process; log loaded weights at INFO level

**Checkpoint**: Configuration changes apply on next session start. Invalid configs are safely rejected. User Stories 1, 2, AND 3 are all functional.

---

## Phase 6: User Story 4 — Synthetic Session Replay (Priority: P4)

**Goal**: A CLI utility generates 5+ realistic synthetic historical sessions and writes them to Firestore, so the dashboard shows history even with only one device

**Independent Test**: Run `python -m synthetic --sessions 5`, verify 5 session documents appear in Firestore with valid tick subcollections and summaries; payloads pass schema validation

### Implementation

- [X] T022 [US4] Implement synthetic data generator in `device/synthetic/generator.py` — provide `generate_session(device_id, start_time, duration_minutes) -> tuple[list[dict], dict]` that produces a list of tick payloads and a session summary with realistic engagement patterns (sine wave + random noise for score variation, plausible behavior distributions), all conforming to metric-tick.v1 and session-summary.v1 schemas
- [X] T023 [US4] Implement synthetic CLI entry point in `device/synthetic/__main__.py` — accept `--sessions N` (default 5), `--device-id` (default hostname), `--duration` (default 30 min); for each session: generate data (T022), write session document + all tick docs to Firestore (T010), print progress; uses same emitter and schema builder as real sessions
- [X] T024 [US4] Add `--dry-run` flag to `device/synthetic/__main__.py` — when set, print generated payloads to stdout as JSON instead of writing to Firestore, for validation without cloud access

**Checkpoint**: Synthetic sessions populate Firestore. Dashboard can display historical engagement data. All 4 user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Stability, documentation, and demo-readiness improvements

- [X] T025 [P] Add structured logging throughout all modules in `device/engagement_monitor/` — use Python `logging` with format `%(asctime)s %(levelname)s %(name)s %(message)s`, log inference results at DEBUG, tick emissions at INFO, errors at ERROR
- [X] T026 [P] Create `device/README.md` with project overview, setup instructions summary, and link to `specs/001-engagement-monitor/quickstart.md`
- [X] T027 Validate full quickstart flow end-to-end per `specs/001-engagement-monitor/quickstart.md` — verify setup steps, run instructions, and troubleshooting entries are accurate
- [X] T028 [P] Add graceful shutdown handling in `device/engagement_monitor/main.py` — catch `SIGINT`/`SIGTERM`, end active session cleanly (emit summary), stop camera, close Firestore connection, exit with code 0
- [X] T029 Handle edge case: no people detected in frame in `device/engagement_monitor/scorer.py` — return `engagementScore: 0` and all-zero `behaviorsSummary` with `peopleDetected: 0` when detection list is empty

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — core monitoring loop
- **Phase 4 (US2)**: Depends on Phase 2 — can run in parallel with US1 but integrates into `main.py`
- **Phase 5 (US3)**: Depends on Phase 2 (config.py from T008) — lightweight, can follow US1
- **Phase 6 (US4)**: Depends on Phase 2 (emitter, schemas) — fully independent of US1/US2/US3
- **Phase 7 (Polish)**: Depends on all desired user stories being complete

### User Story Independence

- **US1 (P1)**: Self-contained monitoring loop. The MVP.
- **US2 (P2)**: Adds session structure to US1's tick loop via `SessionManager` integration in `main.py`. Independently testable.
- **US3 (P3)**: Extends config loading (already in foundational). No dependency on US1 or US2 at the module level — integrates via `main.py` reload call.
- **US4 (P4)**: Completely independent of US1/US2/US3. Uses only foundational modules (emitter, schemas). Can be built at any time after Phase 2.

### Within Each Phase

- Tasks marked [P] can run in parallel
- Scoring (T013) depends on detector (T012) output format
- Main loop (T015) depends on camera (T011), detector (T012), scorer (T013), indicator (T014)
- Session manager (T017) must be complete before main.py integration (T018)

### Parallel Opportunities

**Phase 1** — all tasks are independent:
```
T003 + T004 + T005 + T006  (all [P])
```

**Phase 2** — schemas and emitter are independent:
```
T009 + T010  (all [P], both depend on T008 config but different files)
```

**Phase 3 (US1)** — camera, detector, and indicator are independent:
```
T011 + T012 + T014  (all [P], different files, no cross-dependencies)
```

**Phase 6 (US4)** — can run entirely in parallel with Phases 4 and 5:
```
US4 (T022-T024) parallel with US2 (T017-T019) and US3 (T020-T021)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T010)
3. Complete Phase 3: User Story 1 (T011–T016)
4. **STOP and VALIDATE**: Point camera at a group, start session, confirm tick payloads in Firestore and terminal indicator updating
5. Demo-ready with live engagement scoring ✅

### Incremental Delivery

1. **Setup + Foundational** → Project skeleton and core infrastructure ready
2. **+US1** → Live engagement monitoring with camera → **MVP demo** ✅
3. **+US2** → Formal sessions with summaries → Better demo narrative ✅
4. **+US3** → Tunable weights → Flexibility for different group contexts ✅
5. **+US4** → Synthetic history → Dashboard looks populated on day one ✅
6. **+Polish** → Logging, graceful shutdown, edge cases → Demo stability ✅

Each increment adds value without breaking previous stories.

---

## Notes

- Model files (`model_unquant.tflite`, `labels.txt`) must be placed manually — they come from Teachable Machine export and are not generated by code
- Firebase service account key (`config/service-account-key.json`) must be provisioned manually from Firebase Console
- `picamera2` is installed via `apt`, not `pip` — the venv must use `--system-site-packages`
- All payloads must conform to the versioned JSON schemas in `specs/001-engagement-monitor/contracts/`
- No test tasks included — tests were not explicitly requested in the specification
