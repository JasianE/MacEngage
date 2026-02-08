# API Contracts

Base URL after deploy:

`https://<region>-<project-id>.cloudfunctions.net/api`

All responses use one envelope:

- Success: `{ "ok": true, "data": ... }`
- Error: `{ "ok": false, "message": "...", "details": "..." }`

## GET /health

Health check.

### Response 200

```json
{
  "ok": true,
  "data": {
    "service": "api",
    "status": "up"
  }
}
```

## POST /start

Queue a remote start command for a device.

### Request body

```json
{
  "deviceId": "pi-01",
  "sessionName": "Calculus II"
}
```

### Response 201

```json
{
  "ok": true,
  "data": {
    "commandId": "abc123",
    "type": "start_session",
    "sessionName": "Calculus II",
    "status": "pending"
  }
}
```

## POST /end

Queue a remote end command for a device.

### Request body

```json
{
  "deviceId": "pi-01"
}
```

### Response 201

```json
{
  "ok": true,
  "data": {
    "commandId": "abc123",
    "type": "end_session",
    "status": "pending"
  }
}
```

## POST /create-user
## POST /sign-up
## POST /signup

Create a Firebase Auth user (all three routes are aliases).

### Request body

```json
{
  "email": "user@example.com",
  "password": "secret",
  "displayName": "User Name"
}
```

### Response 201

```json
{
  "ok": true,
  "data": {
    "uid": "uid123",
    "email": "user@example.com",
    "displayName": "User Name",
    "profileSynced": true
  }
}
```

## POST /login

Email/password login via Firebase Identity Toolkit.

### Request body

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

### Response 200

```json
{
  "ok": true,
  "data": {
    "uid": "uid123",
    "email": "user@example.com",
    "idToken": "...",
    "refreshToken": "...",
    "expiresIn": "3600"
  }
}
```

## GET /getAllSessionInfo/:userId

Fetch sessions by `userId` field.

Each returned session is normalized to include:

- `id`
- `userId`
- `deviceId`
- `title`
- `overallScore`
- `comments`
- `startedAt`
- `endedAt`
- `createdAt`
- `updatedAt`

### Response 200

```json
{
  "ok": true,
  "data": {
    "userId": "uid123",
    "count": 2,
    "sessions": [
      { "id": "sessionA" },
      { "id": "sessionB" }
    ]
  }
}
```

## GET /sessionInfo/:sessionId

Fetch one session document.

The response also includes ownership and timing fields (`userId`, `deviceId`, `startedAt`, `endedAt`, etc.) when available.

### Response 200

```json
{
  "ok": true,
  "data": {
    "id": "sessionA",
    "title": "Session ...",
    "overallScore": 75,
    "comments": []
  }
}
```

### Response 404

`{ "ok": false, "message": "Session not found" }`

## PATCH /sessionInfo/:sessionId

Patch `description` and/or `comments`.

### Request body

```json
{
  "description": "Session notes",
  "comments": ["Good pacing", "Need more interaction"]
}
```

### Response 200

```json
{
  "ok": true,
  "data": {
    "id": "sessionA"
  }
}
```

## PATCH /devices/:deviceId/owner

Set or update the owning user for a device. This is used to ensure newly created sessions are linked to the correct user (`sessions/{sessionId}.userId`).

### Request body

```json
{
  "userId": "uid123"
}
```

### Response 200

```json
{
  "ok": true,
  "data": {
    "deviceId": "handwashpi",
    "ownerUserId": "uid123"
  }
}
```

## GET /live

Fetch live data for a known session.

### Query params

- `sessionId` (required)
- `limit` (optional, default 200, clamped to 1..1000)

### Response 200

```json
{
  "ok": true,
  "data": {
    "sessionId": "sessionA",
    "count": 3,
    "liveData": [
      { "id": "tick1", "timeSinceStart": 5, "engagementScore": 74 }
    ]
  }
}
```

## GET /live/current

Fetch live data for the device's current active session.

### Query params

- `deviceId` (required)

> Note: this endpoint does **not** accept `limit`.

### Behavior

- Reads `devices/{deviceId}.currentSessionId`.
- If no active session pointer exists, returns empty `liveData` with `sessionId: null`.

### Response 200 (active session)

```json
{
  "ok": true,
  "data": {
    "deviceId": "pi-01",
    "sessionId": "sessionA",
    "count": 3,
    "liveData": [
      { "id": "tick1", "timeSinceStart": 5, "engagementScore": 74 }
    ]
  }
}
```

### Response 200 (no active session)

```json
{
  "ok": true,
  "data": {
    "deviceId": "pi-01",
    "sessionId": null,
    "count": 0,
    "liveData": []
  }
}
```

## POST /ai/session-summary/:sessionId

Generate a session-level AI summary from session metadata + live engagement timeline.

### Request body

```json
{
  "forceRefresh": false
}
```

`forceRefresh` is optional; when `true`, bypasses cached insight and regenerates.

### Response 200

```json
{
  "ok": true,
  "data": {
    "keyInsights": "Engagement averaged 78% ...",
    "recommendations": [
      "Insert a short pair activity before minute 22.",
      "Re-use the coding challenge format near minute 35."
    ],
    "source": "gemini",
    "generatedAt": "2026-02-08T15:25:00.000Z",
    "cache": {
      "hit": false,
      "key": "<hash>"
    }
  }
}
```

### Response 404

`{ "ok": false, "message": "Session not found" }`

## POST /ai/comparison-summary

Generate a multi-session AI comparison summary.

### Request body

```json
{
  "sessionIds": ["sessionA", "sessionB"],
  "forceRefresh": false
}
```

### Response 200

```json
{
  "ok": true,
  "data": {
    "summary": "Session A maintained a stronger baseline ...",
    "recommendations": [
      "Move independent work after the first high-engagement block.",
      "Add a recap interaction before each identified dip window.",
      "Track intervention outcomes for one week to validate effect."
    ],
    "metrics": {
      "peakCorrelationLabel": "Session A @ 24m",
      "attentionSpanLabel": "~22 Minutes",
      "recaptureRateLabel": "74% after intervention"
    },
    "source": "gemini",
    "generatedAt": "2026-02-08T15:26:00.000Z",
    "cache": {
      "hit": false,
      "key": "<hash>"
    }
  }
}
```

## Gemini key configuration (server-side only)

- Do **not** put Gemini keys in frontend env files.
- The `api` function expects a Firebase Functions secret named `GEMINI_API_KEY`.
- `exports.api` is configured with `secrets: ["GEMINI_API_KEY"]`.

Set via CLI:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```