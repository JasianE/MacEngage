# Feature Specification: Live Group Engagement Monitor — Device-Side System

**Feature Branch**: `001-engagement-monitor`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: User description: "Build the device-side system for a Live Group Engagement Monitor. The device observes a seated group and produces an engagement signal. It performs on-device inference to detect a small set of defined behaviors, converts detections into an engagement score, and emits only anonymized aggregate metrics for storage and dashboard visualization."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Real-Time Engagement Monitoring During a Session (Priority: P1)

A facilitator places the device in a room and starts a monitoring session. While the session is running, the device continuously observes the seated group, detects defined behaviors, computes an engagement score each tick, and emits anonymized aggregate metrics. The facilitator can glance at a simple local indicator to see the current engagement level without needing to check an external dashboard.

**Why this priority**: This is the core value loop of the product. Without real-time detection, scoring, and emission, nothing else functions. A working session with live metrics is the minimum viable demonstration.

**Independent Test**: Can be fully tested by starting a session, allowing the device to observe a group (or synthetic input), and confirming that JSON metric payloads are emitted at each tick with correct structure and engagement scores. The local glanceable indicator must also reflect the current score.

**Acceptance Scenarios**:

1. **Given** the device is powered on and pointed at a seated group, **When** a facilitator starts a session, **Then** the device begins emitting JSON metric payloads at each configured tick interval.
2. **Given** a session is active, **When** the device detects behaviors in the group, **Then** each emitted payload contains an engagement score derived from weighted detections, clamped between 0 and 100.
3. **Given** a session is active, **When** the facilitator looks at the device's local indicator, **Then** they see a simple, glanceable representation of the current engagement score (e.g., color-coded light or small display) without detailed per-person data.
4. **Given** a session is active, **When** a tick completes, **Then** the emitted JSON payload includes schemaVersion, deviceId, sessionId, timestamp, and engagement score — with no media or personally identifiable information.

---

### User Story 2 — Session Lifecycle Management (Priority: P2)

A facilitator starts a monitoring session before a class or meeting, lets it run for the duration, and then ends it. Upon ending, the device produces a session summary with overall statistics so the facilitator can review the engagement profile of the entire session.

**Why this priority**: Session boundaries give structure and meaning to collected data. Without start/end semantics and a summary, the metrics are an unbounded stream with no way to review a completed session.

**Independent Test**: Can be tested by starting a session, letting it run for several ticks, ending it, and verifying the session summary payload includes duration, average engagement, and a timeline reference.

**Acceptance Scenarios**:

1. **Given** the device is idle, **When** a facilitator initiates "start session," **Then** the device creates a new session with a unique session ID and begins emitting periodic metrics.
2. **Given** a session is active, **When** the facilitator initiates "end session," **Then** the device stops emitting periodic metrics and produces a session summary.
3. **Given** a session has just ended, **When** the session summary is emitted, **Then** it contains at minimum: total session duration, average engagement score across all ticks, and a reference to the timeline of per-tick data.
4. **Given** a session is active, **When** the facilitator attempts to start a second session, **Then** the system prevents overlapping sessions and provides a clear indication that a session is already running.

---

### User Story 3 — Configurable Behavior Weights (Priority: P3)

An administrator adjusts the scoring weights for specific behaviors to reflect different engagement models (e.g., a hands-on workshop versus a lecture). The device uses the updated weights for all subsequent sessions.

**Why this priority**: Configurability allows the system to adapt to different contexts without code changes. It extends the tool's usefulness across varied group settings, but the system functions well with defaults, so this is lower priority.

**Independent Test**: Can be tested by changing a weight configuration (e.g., setting `writing_notes` to +50 instead of +80), running a session, and verifying the engagement score calculation reflects the updated weight.

**Acceptance Scenarios**:

1. **Given** the device has default behavior weights loaded, **When** an administrator provides a new weight configuration, **Then** the device accepts and stores the updated weights.
2. **Given** updated weights are active, **When** a new session starts and behaviors are detected, **Then** the engagement score is calculated using the updated weights.
3. **Given** an administrator provides an invalid weight configuration (e.g., missing behaviors, non-numeric values), **When** the configuration is applied, **Then** the device rejects it and continues using the previous valid configuration, notifying the administrator of the error.

---

### User Story 4 — Synthetic Session Replay for Dashboard History (Priority: P4)

A demo operator generates or replays pre-built synthetic sessions so the connected dashboard can display historical engagement data — even if only one physical device exists and only one real session has occurred.

**Why this priority**: Essential for a compelling hackathon demo. Without historical data the dashboard appears empty. However, it is not part of the core monitoring loop, so it is lower priority than real-time functionality.

**Independent Test**: Can be tested by triggering synthetic session generation, verifying that the emitted payloads are structurally identical to real session payloads, and confirming the dashboard can display them as historical sessions.

**Acceptance Scenarios**:

1. **Given** the device or a companion utility is available, **When** a demo operator triggers synthetic session generation, **Then** the system produces one or more complete session data sets (tick payloads + session summary) with realistic engagement patterns.
2. **Given** synthetic sessions have been generated, **When** the dashboard queries for historical data, **Then** the synthetic sessions appear alongside any real sessions and are visually indistinguishable in format.
3. **Given** synthetic sessions are generated, **When** reviewing their payloads, **Then** each payload conforms to the same JSON schema as real session payloads (including schemaVersion, deviceId, sessionId, timestamp, and engagement score).

---

### Edge Cases

- What happens when the device camera cannot confidently detect a known behavior? The system should emit a tick with an engagement score of 0, and the local indicator should reflect "no engagement detected."
- What happens if the device loses power or crashes mid-session? The session should be recoverable or at minimum the already-emitted ticks should remain valid. Upon restart, the device should be in an idle state (no orphaned active session).
- What happens when all detected behaviors in a tick are negative/neutral (weight = 0)? The engagement score should be 0 — the clamp lower bound.
- What happens when the sum of weighted behavior scores exceeds 100? The engagement score should be clamped to 100 — the clamp upper bound.
- How does the system handle a tick where the inference model reports low-confidence detections? The system should apply a confidence threshold; detections below the threshold are excluded from scoring for that tick.
- What happens if no weight configuration file is found at startup? The device should fall back to the documented default weights and log a notice.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Behavior Detection

- **FR-001**: The device MUST perform on-device inference to detect the following positive behaviors in a seated group: `raising_hand`, `writing_notes`, `looking_at_board`.
- **FR-002**: The device MUST perform on-device inference to detect the following negative/neutral behaviors: `on_phone`, `head_down`, `talking_to_group`, `hands_on_head`, `looking_away_long`.
- **FR-003**: Detection output MUST be used for group-level scoring only and MUST NOT include per-person counts.
- **FR-004**: The device MUST NOT store, transmit, or expose any per-person identification data, images, or video frames.

#### Engagement Scoring

- **FR-005**: The device MUST compute an engagement score each tick by applying configurable weights to detected behaviors and summing the results.
- **FR-006**: Default behavior weights MUST be: `raising_hand` +100, `writing_notes` +80, `looking_at_board` +75, `on_phone` 0, `head_down` 0, `talking_to_group` +15, `hands_on_head` +30, `looking_away_long` +20.
- **FR-007**: The engagement score MUST be clamped to the range [0, 100] per tick.
- **FR-008**: Behavior weights MUST be configurable without requiring a code change (e.g., via a configuration file or settings interface).

#### Session Lifecycle

- **FR-009**: The device MUST support a discrete session lifecycle: start session → emit periodic metrics → end session.
- **FR-010**: Starting a session MUST generate a unique session identifier.
- **FR-011**: Ending a session MUST produce a session summary containing at minimum: total duration, average engagement score, and a timeline reference to the per-tick data.
- **FR-012**: The device MUST prevent starting a new session while one is already active.

#### Data Emission

- **FR-013**: Each periodic metric payload MUST be a JSON object containing: `schemaVersion`, `deviceId`, `sessionId`, `timestamp`, and `engagementScore`.
- **FR-014**: No payload — periodic or summary — MUST contain any media (images, audio, or video).
- **FR-015**: The schema version MUST be included in every payload to support forward-compatible consumers.

#### Local Indicator

- **FR-016**: The device MUST provide a glanceable local output that reflects the current engagement score in a simple, low-detail format (e.g., color-coded indicator or numeric display).
- **FR-017**: The local indicator MUST update at least once per tick.

#### Synthetic / Demo Data

- **FR-018**: The system MUST provide a mechanism to generate or replay synthetic historical sessions that produce payloads identical in structure to real sessions.
- **FR-019**: Synthetic sessions MUST include realistic variation in engagement scores across ticks to simulate plausible group behavior over time.

#### Privacy & Safety

- **FR-020**: All emitted data MUST be anonymized and aggregated — no individual-level tracking or biometric data may leave the device.
- **FR-021**: The inference pipeline MUST process frames in memory only; raw frames MUST NOT be persisted to disk or transmitted.
- **FR-022**: The device MUST NOT expose any network endpoint that serves raw camera feeds or images.

### Key Entities

- **Session**: A bounded monitoring period with a unique ID, start time, end time, and a collection of metric ticks. A session transitions through states: idle → active → completed.
- **Metric Tick**: A single point-in-time observation containing a timestamp and computed engagement score. Belongs to exactly one session.
- **Engagement Score**: A numeric value in the range [0, 100] computed per tick from weighted behavior detections.
- **Weight Configuration**: A mapping of each behavior label to a numeric weight, used in scoring. Has documented defaults and can be overridden.
- **Session Summary**: An aggregate record produced when a session ends, containing duration, average engagement score, and a reference to the session's tick timeline.
- **Device**: The physical unit performing observation and inference. Identified by a unique `deviceId`.

---

## Assumptions

- **Tick interval**: A reasonable default tick interval of 5 seconds is assumed. This balances responsiveness with inference cost.
- **Single camera input**: The device uses a single camera pointed at the seated group. Multi-camera setups are out of scope.
- **Local network availability**: The device is assumed to have local network connectivity for emitting JSON payloads (e.g., Wi-Fi). Offline buffering and retry is not in scope for the initial version.
- **Dashboard is a separate system**: This spec covers the device-side only. The dashboard that consumes and visualizes the emitted metrics is a separate feature/system.
- **Synthetic data utility**: The synthetic session generator may run on the device itself or as a companion utility on a connected machine — either approach satisfies FR-018.
- **Confidence threshold**: A sensible default confidence threshold (e.g., 60%) is applied to inference detections. Detections below this threshold are excluded from scoring. This threshold is configurable alongside behavior weights.
- **Hackathon demo context**: Stability takes precedence over comprehensive error recovery. The system should be reliable for a multi-hour demo session without requiring restarts.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The device produces a valid JSON metric payload at every tick interval throughout a session, with zero missed ticks during a 60-minute demo session.
- **SC-002**: Each emitted payload conforms to the defined JSON schema, passing schema validation with no errors.
- **SC-003**: The engagement score accurately reflects the configured behavior weights — given a known set of behavior detections, the score matches the expected weighted calculation within ±1 point.
- **SC-004**: Session start and end commands complete within 2 seconds, with the summary payload emitted within 5 seconds of session end.
- **SC-005**: The local glanceable indicator updates within one tick interval of score changes, providing at-a-glance awareness to a facilitator standing 2 meters away.
- **SC-006**: No payload emitted during any session contains personally identifiable information, media, or per-person data — verified by schema validation and manual audit of sample payloads.
- **SC-007**: The synthetic session generator produces at least 5 realistic historical sessions that are accepted and displayed by the dashboard without distinguishing them from real sessions.
- **SC-008**: The device runs a continuous 2-hour demo session without crashes, hangs, or requiring a restart.
- **SC-009**: Behavior weight configuration changes take effect on the next session start without requiring a device restart or redeployment.
