# Demo Data Seeder (Backend)

This guide seeds a **demo login account** and **historical patterned sessions** so you can sign in and immediately show meaningful dashboard trends.

## What gets created

- Firebase Auth user (default): `demo@engagemint.app`
- Firestore profile: `users/{demoUid}`
- Historical sessions: `sessions/{sessionId}` with `userId = demoUid`
- Session timeline ticks: `sessions/{sessionId}/liveData/{tickId}`

The seeded sessions include visible patterns like:
- Slow start, strong recovery
- Mid-session dip + rebound
- End-of-class fatigue
- High volatility
- Intervention before/after pair
- Week-over-week improvement

---

## Prerequisites (one-time)

From project root:

1. Install function deps:

```bash
npm --prefix functions install
```

2. Authenticate Firebase Admin credentials in your shell (choose one):

- **Option A (recommended local):**
  ```bash
  export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account-key.json"
  ```
- **Option B (if gcloud ADC already configured):**
  ```bash
  gcloud auth application-default login
  ```

---

## Run seeder (standard)

```bash
npm --prefix functions run seed:demo -- --reset
```

This will:
- ensure demo user exists (and refresh password/display name)
- remove prior seeded demo sessions (`--reset`)
- create fresh historical demo sessions

---

## Login credentials (default)

- Email: `demo@engagemint.app`
- Password: `DemoPass!2026`

You can override these when seeding:

```bash
npm --prefix functions run seed:demo -- --reset --email "your-demo@engagemint.app" --password "YourStrongPass!123"
```

---

## Useful options

```bash
npm --prefix functions run seed:demo -- --reset --sessions 12 --days 21 --duration 40 --tick 5 --seed 42
```

- `--sessions`: number of historical sessions
- `--days`: history window in days
- `--duration`: minutes per session
- `--tick`: seconds per liveData point
- `--seed`: deterministic random seed for repeatable charts
- `--reset`: delete previously seeded demo sessions for this demo user
