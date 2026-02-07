# Data Model: Live Group Engagement Monitor — Device-Side System

**Feature**: `001-engagement-monitor`  
**Date**: 2026-02-07

---

## Entities

### 1. Session

A bounded monitoring period from start to end.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `sessionId` | string (UUID v4) | Required, unique | Unique identifier generated at session start |
| `deviceId` | string | Required | Identifier of the physical device running the session |
| `startedAt` | ISO 8601 datetime | Required | UTC timestamp when session was started |
| `endedAt` | ISO 8601 datetime | Null while active | UTC timestamp when session was ended |
| `status` | enum | `"active"` \| `"completed"` | Current session state |

**State Transitions**:
```
idle → active (start session)
active → completed (end session)
```

**Validation Rules**:
- `endedAt` MUST be null while `status` is `"active"`
- `endedAt` MUST be after `startedAt` when `status` is `"completed"`
- Only one session may have `status = "active"` per device at any time

**Relationships**:
- Has many **Metric Ticks** (one per tick interval during the session)
- Has one **Session Summary** (generated on session end)
- Belongs to one **Device**

---

### 2. MetricTick

A single point-in-time aggregate observation.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `schemaVersion` | string (semver) | Required, e.g. `"1.0.0"` | Schema version for forward compatibility |
| `deviceId` | string | Required | Device that produced this tick |
| `sessionId` | string (UUID v4) | Required, FK → Session | Session this tick belongs to |
| `timestamp` | ISO 8601 datetime | Required | UTC timestamp of this observation |
| `engagementScore` | integer | Required, range [0, 100] | Weighted aggregate engagement score |
| `behaviorsSummary` | BehaviorsSummary | Required | Aggregate behavior counts for this tick |
| `peopleDetected` | integer | Required, range [0, ∞) | Total number of people detected in frame |

**Validation Rules**:
- `engagementScore` MUST be in range [0, 100] (clamped)
- `behaviorsSummary` MUST contain all 8 defined behaviors with non-negative integer counts
- Sum of all behavior counts MUST equal `peopleDetected`
- `sessionId` MUST reference an active session
- `timestamp` MUST be within the session's active period

---

### 3. BehaviorsSummary

Aggregate count per behavior across the observed group for one tick. Embedded in MetricTick.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `raising_hand` | integer | ≥ 0 | Count of people detected raising hand |
| `writing_notes` | integer | ≥ 0 | Count of people detected writing notes |
| `looking_at_board` | integer | ≥ 0 | Count of people detected looking at board |
| `on_phone` | integer | ≥ 0 | Count of people detected on phone |
| `head_down` | integer | ≥ 0 | Count of people detected with head down |
| `talking_to_group` | integer | ≥ 0 | Count of people detected talking to group |
| `hands_on_head` | integer | ≥ 0 | Count of people detected with hands on head |
| `looking_away_long` | integer | ≥ 0 | Count of people detected looking away |

**Validation Rules**:
- All fields MUST be non-negative integers
- All 8 behavior fields MUST be present (no partial summaries)

**Categories**:
- **Positive**: `raising_hand`, `writing_notes`, `looking_at_board`
- **Negative/Neutral**: `on_phone`, `head_down`, `talking_to_group`, `hands_on_head`, `looking_away_long`

---

### 4. SessionSummary

Aggregate statistics emitted when a session ends. Embedded in the session close payload.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `schemaVersion` | string (semver) | Required | Schema version |
| `deviceId` | string | Required | Device that ran the session |
| `sessionId` | string (UUID v4) | Required, FK → Session | Session being summarized |
| `startedAt` | ISO 8601 datetime | Required | Session start time |
| `endedAt` | ISO 8601 datetime | Required | Session end time |
| `durationSeconds` | integer | Required, > 0 | Total session duration in seconds |
| `averageEngagement` | float | Required, range [0.0, 100.0] | Mean engagement score across all ticks |
| `tickCount` | integer | Required, ≥ 1 | Number of metric ticks emitted |
| `timelineRef` | string | Required | Firestore collection path to the tick data |

**Validation Rules**:
- `durationSeconds` MUST equal `endedAt - startedAt` in seconds (±1s tolerance)
- `averageEngagement` MUST be the arithmetic mean of all tick `engagementScore` values
- `timelineRef` MUST be a valid Firestore collection path

---

### 5. WeightConfiguration

Configurable mapping of behavior labels to numeric scoring weights.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `raising_hand` | integer | Any integer | Weight for raising hand behavior |
| `writing_notes` | integer | Any integer | Weight for writing notes behavior |
| `looking_at_board` | integer | Any integer | Weight for looking at board behavior |
| `on_phone` | integer | Any integer | Weight for on phone behavior |
| `head_down` | integer | Any integer | Weight for head down behavior |
| `talking_to_group` | integer | Any integer | Weight for talking to group behavior |
| `hands_on_head` | integer | Any integer | Weight for hands on head behavior |
| `looking_away_long` | integer | Any integer | Weight for looking away behavior |
| `confidenceThreshold` | float | Range (0.0, 1.0) | Minimum confidence to include a detection |
| `tickIntervalSeconds` | integer | Range [1, 60] | Seconds between metric ticks |

**Default Values**:
```json
{
  "raising_hand": 100,
  "writing_notes": 80,
  "looking_at_board": 75,
  "on_phone": 0,
  "head_down": 0,
  "talking_to_group": 15,
  "hands_on_head": 30,
  "looking_away_long": 20,
  "confidenceThreshold": 0.6,
  "tickIntervalSeconds": 5
}
```

**Validation Rules**:
- All 8 behavior weight fields MUST be present
- All weight values MUST be numeric (integers)
- `confidenceThreshold` MUST be in range (0.0, 1.0)
- `tickIntervalSeconds` MUST be in range [1, 60]
- If validation fails, the system MUST reject the config and retain previous valid config

---

## Firestore Collection Structure

```
firestore/
├── sessions/
│   └── {sessionId}/                    ← Session document
│       ├── deviceId: string
│       ├── startedAt: timestamp
│       ├── endedAt: timestamp | null
│       ├── status: "active" | "completed"
│       ├── summary: SessionSummary     ← populated on session end
│       └── ticks/                      ← subcollection
│           └── {auto_id}/              ← MetricTick document
│               ├── schemaVersion
│               ├── deviceId
│               ├── sessionId
│               ├── timestamp
│               ├── engagementScore
│               ├── behaviorsSummary
│               └── peopleDetected
```

**Design Rationale**:
- Sessions at the top level enable cross-device querying by the dashboard
- Ticks as a subcollection scope queries to a single session, keeping reads efficient
- Session summary is embedded in the session document (not a separate collection) to allow atomic reads
- `SERVER_TIMESTAMP` used for Firestore `timestamp` fields to avoid clock-drift issues

---

## Entity Relationship Diagram (text)

```
Device (1) ──produces──> (N) Session
Session (1) ──contains──> (N) MetricTick
Session (1) ──has──> (1) SessionSummary
MetricTick (1) ──embeds──> (1) BehaviorsSummary
Device (1) ──loads──> (1) WeightConfiguration
```
