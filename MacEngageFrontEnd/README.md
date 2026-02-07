# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## MacEngage Frontend Integration (Current Backend)

There is no custom Express/Node API in this repo right now. The frontend should use Firebase SDK directly.

### Data model in Firestore

```
sessions/{sessionId}
  title: string
  overallScore: number
  comments: string[]

sessions/{sessionId}/liveData/{dataId}
  timeSinceStart: number
  engagementScore: number
```

### Mapping requested REST endpoints to Firebase actions

- `POST /create-user`, `POST /sign-up`
  - Use Firebase Auth: `createUserWithEmailAndPassword(auth, email, password)`
- Login
  - Use Firebase Auth: `signInWithEmailAndPassword(auth, email, password)`
- `GET /getAllSessionInfo/:userId`
  - Use Firestore query on `sessions` (currently no `userId` field in model)
- `GET /sessionInfo/:sessionId`
  - Read `doc(db, "sessions", sessionId)`
- `GET /live`
  - Read or subscribe to `collection(db, "sessions", sessionId, "liveData")`
  - Use `onSnapshot(...)` for live graph updates
- Update description/comments
  - Current model supports `comments` array in `sessions/{sessionId}`
  - Frontend can update via `updateDoc(...)` once Firestore rules allow it

### Start / End session from frontend (implemented path)

Device code now supports remote command docs in Firestore.

Write command docs to:

```
devices/{deviceId}/commands/{commandId}
```

with fields:

```json
{
  "type": "start_session",
  "status": "pending"
}
```

or:

```json
{
  "type": "end_session",
  "status": "pending"
}
```

The Pi app processes these and updates command status (`processed`/`rejected`).

### Important runtime flag on Raspberry Pi

Remote command handling is disabled by default for safety.

Enable it when running the device app:

```bash
ENABLE_REMOTE_COMMANDS=1 python -m engagement_monitor
```

### What is still missing (if you require exact REST URLs)

If frontend must call exact HTTP routes like `/start`, `/end`, `/getAllSessionInfo/:userId`, you still need a thin API layer (Cloud Functions or Express) that translates those routes into Firebase SDK operations.
