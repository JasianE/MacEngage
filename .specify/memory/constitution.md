<!--
  Sync Impact Report (v1.0.0)
  ===========================
  Version: INITIAL → 1.0.0
  
  Principles Defined:
  - I. Privacy-First
  - II. Edge-First
  - III. Demo-Safe
  - IV. Configurable Scoring
  - V. Clear Contracts
  - VI. Simplicity
  - VII. Transparency
  
  Sections Added:
  - Explicit Non-Goals
  - Development Constraints
  - Governance
  
  Templates Status:
  ✅ plan-template.md: Constitution Check section ready for validation
  ✅ spec-template.md: Functional requirements align with principles
  ✅ tasks-template.md: Task categorization supports principle-driven work
  
  Follow-Up Action Items:
  - None: All placeholders resolved
  
  Commit Message:
  docs: establish constitution v1.0.0 (7 privacy & edge-first principles)
-->

# Live Student Engagement Monitor Constitution

## Core Principles

### I. Privacy-First (NON-NEGOTIABLE)

**The system MUST NOT identify, track, or expose data about individual people.**

- **No facial recognition**: No algorithms or models that identify specific individuals
- **No per-person analytics**: Aggregate metrics only; no individual scores, names, or identifiers exposed in UI, API, or storage
- **No raw media transmission**: Video frames MUST NOT leave the device; only processed aggregate metrics may be transmitted
- **No raw media storage**: Video MUST NOT be saved to disk, logged, or persisted in any form on the device or remotely

**Rationale**: This is a hackathon demo focused on group engagement patterns, not surveillance. Privacy compliance and ethical AI use are non-negotiable constraints. Any feature that risks individual identification is automatically rejected.

---

### II. Edge-First

**All video processing MUST occur on the Raspberry Pi device; only anonymized aggregate metrics may leave the device.**

- Video frames are processed in-memory and discarded immediately after inference
- Only aggregated numerical metrics (e.g., "% attentive", "avg movement score") may be transmitted
- Device operates autonomously; network failure MUST NOT halt engagement scoring
- Cloud/backend receives metrics via JSON payloads but never raw media

**Rationale**: Edge processing enforces privacy (no media upload/storage) and enables offline demos. Keeping inference on-device ensures the system works in bandwidth-constrained or privacy-sensitive environments.

---

### III. Demo-Safe

**The system MUST work for any seated group in a generic environment without classroom-specific configuration.**

- No hardcoded assumptions about room layout, seating arrangement, or group size
- Must handle variable lighting, backgrounds, and camera angles
- Calibration (if required) MUST be simple and completable in <2 minutes
- Scoring logic MUST degrade gracefully if detection confidence is low (e.g., show "insufficient data" rather than incorrect scores)

**Rationale**: Hackathon demos occur in unpredictable environments (maker spaces, conference rooms, cafes). The system must be robust to variability to avoid demo failures.

---

### IV. Configurable Scoring

**Behavior weights and scoring thresholds MUST be adjustable without code changes.**

- Scoring parameters (e.g., "looking at screen = 0.7, writing = 0.5") MUST be defined in an external configuration file (JSON/YAML)
- Changes to weights MUST NOT require recompilation or code edits
- Configuration file MUST include inline comments explaining each parameter's purpose
- System MUST validate configuration on startup and fail fast with clear error messages if invalid

**Rationale**: Different contexts value different behaviors (lecture vs. discussion vs. lab work). Configurable weights allow rapid iteration during demos and let non-developers tune scoring logic.

---

### V. Clear Contracts

**Data payloads emitted by the device MUST be explicitly defined, versioned, and documented.**

- JSON schema MUST be defined for all metrics payloads sent from device to backend
- Schema MUST include: version number, timestamp format, metric definitions, units, and valid ranges
- Breaking changes to schema MUST increment version number
- Device MUST include schema version in every payload
- Documentation MUST provide example payloads with annotated field descriptions

**Rationale**: Clear contracts enable independent development of device software and dashboard/backend. Versioning prevents silent breakage when schema evolves. Documentation ensures maintainability.

---

### VI. Simplicity (YAGNI)

**Prioritize a reliable demo over extra features; minimize moving parts.**

- Start with the simplest implementation that proves the concept (MVP-first)
- No feature is added unless it directly supports a demo scenario or core principle
- Prefer well-tested libraries over custom implementations (e.g., use OpenCV for video, existing pose detection models)
- No premature optimization: prioritize correctness and reliability over performance until demo requirements are unmet
- No distributed systems, microservices, or unnecessary architectural complexity

**Rationale**: Hackathon timelines demand focus. Every additional component increases failure risk. Ship a working MVP before adding enhancements.

---

### VII. Transparency

**Scoring logic MUST be explainable, auditable, and not a black box.**

- Behavior inference pipeline MUST be documented: which models/algorithms are used, which visual cues map to which behaviors
- Scoring formula MUST be documented with worked examples (e.g., "If 3/5 people looking at screen, engagement = (3/5) * weight_attention")
- Logs MUST capture intermediate scoring steps (e.g., "Detected 4 faces, 3 looking forward, 2 writing") for debugging
- System MUST provide a debug mode that visualizes detection outputs (bounding boxes, gaze directions) on the device screen for validation

**Rationale**: Engagement scoring involves subjective judgment. Transparency builds trust, enables tuning, and allows auditors to verify the system doesn't misrepresent behavior. Black-box scoring would undermine demo credibility.

---

## Explicit Non-Goals

**The following are OUT OF SCOPE and MUST NOT be implemented:**

- **Streaming or Recording Media**: No live video streaming, video recording, or frame archival—neither on-device nor to cloud
- **Individual Tracking**: No persistent tracking of specific individuals across frames or sessions; no per-person score histories
- **Identification Features**: No name labels, student IDs, biometric enrollment, or face recognition databases
- **Real-Time Alerts on Individuals**: No notifications like "Student X is disengaged" or "Person Y left the room"
- **Attendance Tracking**: No roll call, sign-in, or presence logging tied to identities

**Rationale**: These features violate Privacy-First and Edge-First principles. Rejecting them explicitly prevents scope creep and maintains ethical boundaries.

---

## Development Constraints

### Technology Stack

- **Device Platform**: Raspberry Pi 4 (or compatible single-board computer)
- **Language**: Python (preferred for rapid prototyping and ML library compatibility)
- **Vision Libraries**: OpenCV, MediaPipe, or similar for video capture and behavior inference
- **Configuration Format**: JSON or YAML for scoring weights and schema definitions
- **Metrics Transport**: HTTP POST (JSON payload) to backend API endpoint; fallback to local storage if network unavailable

### Performance Targets

- **Inference Latency**: Process frames at ≥5 FPS (sufficient for engagement trends; not real-time video processing)
- **Startup Time**: Device ready to score engagement within 30 seconds of power-on
- **Memory Footprint**: Operate within 2GB RAM (typical Pi 4 constraint with OS overhead)

### Testing Requirements

- **Contract Tests**: Validate JSON payload structure matches schema definition
- **Behavioral Tests**: Verify scoring logic with synthetic test cases (e.g., "if all faces looking away, engagement < threshold")
- **Integration Tests**: Confirm device → backend communication under network failure scenarios (graceful degradation)

**Rationale**: These constraints align with the Raspberry Pi form factor and ensure the system is demoable in resource-constrained environments.

---

## Governance

### Amendment Process

1. Proposed changes to principles or constraints MUST be documented in a pull request with rationale
2. Breaking changes (e.g., removing a principle or altering a non-negotiable rule) require explicit approval from project owner
3. Non-breaking clarifications or additions may be approved by any core contributor

### Compliance Verification

- All feature specifications MUST include a "Constitution Check" section confirming alignment with principles
- Code reviews MUST verify:
  - No media storage or transmission (Privacy-First, Edge-First)
  - Scoring logic is documented and configurable (Transparency, Configurable Scoring)
  - Payload schemas are defined and versioned (Clear Contracts)
- Any violations MUST be justified in writing or the feature MUST be rejected

### Versioning Policy

- **MAJOR** version increment: Principle removed, redefined, or non-negotiable constraint relaxed
- **MINOR** version increment: New principle or section added, material expansion of existing guidance
- **PATCH** version increment: Clarifications, wording improvements, typo fixes, non-semantic refinements

---

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07
