# Data Model: Live Group Engagement Monitor — Firebase Backend

**Feature**: `001-engagement-monitor`  
**Date**: 2026-02-07

---

## Canonical Firestore Model

This project uses the following Firebase backend structure as the source of truth:

```
sessions (collection)
 └─ {sessionId} (document)
     ├─ title: string
     ├─ overallScore: number
     ├─ comments: array of strings
     └─ liveData (subcollection)
         └─ {dataId} (document)
             ├─ timeSinceStart: number (seconds)
             └─ engagementScore: number
```

---

## Entity Definitions

### Session Document (`sessions/{sessionId}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Human-readable session title |
| `overallScore` | number | Yes | Aggregate score for the session (average engagement) |
| `comments` | array of strings | Yes | Session-level notes/comments |

Notes:
- `overallScore` is written when the session completes.
- `comments` is initialized as `[]` and can be updated by dashboard workflows.

### Live Data Tick (`sessions/{sessionId}/liveData/{dataId}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `timeSinceStart` | number | Yes | Seconds elapsed since session start |
| `engagementScore` | number | Yes | Tick engagement score, clamped to [0, 100] |

---

## Runtime/Contract Compatibility Notes

- Device runtime still uses internal tick/summary payload builders for validation and computations.
- Firestore persistence is intentionally reduced to the canonical backend model above.
- Timeline references should use `sessions/{sessionId}/liveData`.

---

## Relationship Overview

```
Session (1) ──contains──> (N) LiveData points
```
