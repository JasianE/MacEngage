/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function readProjectIdFromFirebaserc() {
  try {
    const firebasercPath = path.resolve(__dirname, "..", "..", ".firebaserc");
    const content = fs.readFileSync(firebasercPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed?.projects?.default || null;
  } catch (_error) {
    return null;
  }
}

function resolveProjectId() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    readProjectIdFromFirebaserc()
  );
}

function resolveCredentialPath() {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const candidates = [
    path.resolve(__dirname, "..", "config", "service-account-key.json"),
    path.resolve(__dirname, "..", "..", "device", "config", "service-account-key.json"),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found || null;
}

const projectId = resolveProjectId();
if (!projectId) {
  console.error(
    "[backfill] Missing project id. Set GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT / FIREBASE_PROJECT_ID or define projects.default in .firebaserc",
  );
  process.exit(1);
}

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const credentialPath = resolveCredentialPath();

if (!usingEmulator && !credentialPath) {
  console.error(
    "[backfill] Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account key, or run against Firestore emulator via FIRESTORE_EMULATOR_HOST.",
  );
  process.exit(1);
}

if (credentialPath) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

async function backfillSessionOwners() {
  console.log(`[backfill] projectId=${projectId}`);
  if (usingEmulator) {
    console.log(`[backfill] using emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  } else {
    console.log(`[backfill] credentials=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  }
  const sessionsSnap = await db.collection("sessions").get();

  let scanned = 0;
  let updated = 0;
  let unresolved = 0;

  for (const sessionDoc of sessionsSnap.docs) {
    scanned += 1;
    const sessionData = sessionDoc.data() || {};

    if (sessionData.userId) {
      continue;
    }

    const deviceId = sessionData.deviceId;
    if (!deviceId) {
      unresolved += 1;
      console.warn(`[backfill] sessions/${sessionDoc.id} has no deviceId`);
      continue;
    }

    const deviceDoc = await db.collection("devices").doc(String(deviceId)).get();
    const ownerUserId = deviceDoc.exists ? deviceDoc.data()?.ownerUserId : null;

    if (!ownerUserId) {
      unresolved += 1;
      console.warn(
        `[backfill] sessions/${sessionDoc.id} unresolved: devices/${deviceId}.ownerUserId missing`,
      );
      continue;
    }

    await db.collection("sessions").doc(sessionDoc.id).set(
      {
        userId: String(ownerUserId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    updated += 1;
  }

  console.log(
    `[backfill] complete scanned=${scanned} updated=${updated} unresolved=${unresolved}`,
  );
}

backfillSessionOwners()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[backfill] failed", error);
    process.exit(1);
  });
