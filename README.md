# MacEngage

Minimal Firebase-hosted backend API has been added using **Cloud Functions + Express**.

## Backend location

The backend runs on Firebase Cloud Functions (serverless), not on the frontend client.

- Frontend calls HTTPS endpoints
- Cloud Functions reads/writes Firestore + Firebase Auth
- Raspberry Pi device continues using Firestore commands + session/live writes

## Added backend API (Cloud Functions)

Base URL after deploy:

`https://<region>-<project-id>.cloudfunctions.net/api`

Endpoints:

- `GET /health`
- `POST /start` body: `{ "deviceId": "..." }`
- `POST /end` body: `{ "deviceId": "..." }`
- `POST /create-user` body: `{ "email": "...", "password": "...", "displayName": "..." }`
- `POST /sign-up` body: same as create-user
- `POST /login` body: `{ "email": "...", "password": "..." }`
- `GET /getAllSessionInfo/:userId`
- `GET /sessionInfo/:sessionId`
- `GET /live?sessionId=<id>&limit=200`
- `GET /live/current?deviceId=<id>`
- `PATCH /sessionInfo/:sessionId` body: `{ "description": "...", "comments": ["..."] }`

Full request/response contracts are documented in [`docs/api-contracts.md`](docs/api-contracts.md).

## Demo account + historical fake data seeding

For hackathon/demo prep, use the backend seeder to create a demo login and patterned historical sessions:

```bash
npm --prefix functions run seed:demo -- --reset
```

Detailed guide and flags are in [`docs/demo-data-seeder.md`](docs/demo-data-seeder.md).

## Firebase files added

- `functions/index.js` (Express routes)
- `functions/package.json`
- `firebase.json`
- `.firebaserc`

## Deployment (Firebase)

From `MacEngage/`:

1. Install Firebase CLI (if not installed): `npm i -g firebase-tools`
2. Login: `firebase login`
3. Install function deps: `npm --prefix functions install`
4. Set login API key (needed for `/login`):
   - Emulator/local: export env var before run
   - Deploy: `firebase functions:secrets:set FIREBASE_WEB_API_KEY`
5. Deploy: `firebase deploy --only functions`

## Local emulator

From `MacEngage/`:

- `npm --prefix functions install`
- `firebase emulators:start --only functions`

Local base URL:

`http://127.0.0.1:5001/<project-id>/us-central1/api`

## Security note

Per request, this is a **minimal no-auth middleware API** for now.
If you want, next iteration can add token verification and role-based access with minimal route changes.