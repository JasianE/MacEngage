const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const app = express();
let _db = null;

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  if (!_db) {
    _db = admin.firestore();
  }
  return _db;
}

// NOTE:
// Firebase Web API keys are not treated as sensitive secrets.
// For Spark-plan projects (no Secret Manager), you can paste the key below.
// Optional override at runtime: process.env.FIREBASE_WEB_API_KEY
const DEFAULT_FIREBASE_WEB_API_KEY = "AIzaSyCUW35ay88CavEyxLJO6L8rv63ayZTcNko";

app.use(cors({ origin: true }));
app.use(express.json());

function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

function fail(res, message, status = 400, details = undefined) {
  return res.status(status).json({ ok: false, message, details });
}

function safeError(error) {
  return error?.message || "Unexpected error";
}

function normalizeTimestamp(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }

  return null;
}

function mapSessionDoc(doc) {
  const data = doc.data() || {};
  return {
    ...data,
    id: doc.id,
    userId: data.userId || null,
    deviceId: data.deviceId || null,
    title: data.title || null,
    overallScore: typeof data.overallScore === "number" ? data.overallScore : 0,
    comments: Array.isArray(data.comments) ? data.comments : [],
    description: data.description || null,
    startedAt: normalizeTimestamp(data.startedAt) || normalizeTimestamp(data.createdAt),
    endedAt: normalizeTimestamp(data.endedAt),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function mapAuthCreateUserError(error) {
  const code = error?.code || "";
  const message = error?.message || "Failed to create user";

  if (code === "auth/email-already-exists") {
    return { status: 409, message: "An account with this email already exists" };
  }

  if (code === "auth/invalid-email") {
    return { status: 400, message: "Invalid email address" };
  }

  if (code === "auth/invalid-password" || code === "auth/weak-password") {
    return { status: 400, message: "Password is invalid or too weak" };
  }

  return { status: 500, message };
}

async function createUser(req, res) {
  try {
    const db = getDb();
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return fail(res, "email and password are required", 400);
    }

    const user = await admin.auth().createUser({ email, password, displayName });

    let profileSynced = true;
    try {
      await db.collection("users").doc(user.uid).set(
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (profileError) {
      profileSynced = false;
      console.error("[create-user] Auth user created but Firestore profile write failed", {
        uid: user.uid,
        error: safeError(profileError),
      });
    }

    return ok(
      res,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        profileSynced,
      },
      201,
    );
  } catch (error) {
    const mapped = mapAuthCreateUserError(error);
    return fail(res, mapped.message, mapped.status, safeError(error));
  }
}

app.get("/health", (_req, res) => ok(res, { service: "api", status: "up" }));

app.post("/start", async (req, res) => {
  try {
    const db = getDb();
    const { deviceId, sessionName } = req.body || {};
    if (!deviceId) {
      return fail(res, "deviceId is required", 400);
    }
    const normalizedSessionName =
      typeof sessionName === "string" ? sessionName.trim() : "";
    if (!normalizedSessionName) {
      return fail(res, "sessionName is required", 400);
    }

    const payload = {
      type: "start_session",
      sessionName: normalizedSessionName,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("devices").doc(deviceId).collection("commands").add(payload);
    return ok(res, { commandId: docRef.id, ...payload }, 201);
  } catch (error) {
    return fail(res, "Failed to send start command", 500, safeError(error));
  }
});

app.post("/end", async (req, res) => {
  try {
    const db = getDb();
    const { deviceId } = req.body || {};
    if (!deviceId) {
      return fail(res, "deviceId is required", 400);
    }

    const payload = {
      type: "end_session",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("devices").doc(deviceId).collection("commands").add(payload);
    return ok(res, { commandId: docRef.id, ...payload }, 201);
  } catch (error) {
    return fail(res, "Failed to send end command", 500, safeError(error));
  }
});

app.post("/create-user", createUser);
app.post("/sign-up", createUser);
app.post("/signup", createUser);

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, "email and password are required", 400);
    }

    const apiKey = process.env.FIREBASE_WEB_API_KEY || DEFAULT_FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      return fail(
        res,
        "Missing Firebase Web API key. Set process.env.FIREBASE_WEB_API_KEY or DEFAULT_FIREBASE_WEB_API_KEY in functions/index.js",
        500,
      );
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return fail(res, "Login failed", 401, data?.error?.message || "Invalid credentials");
    }

    return ok(res, {
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  } catch (error) {
    return fail(res, "Failed to login", 500, safeError(error));
  }
});

app.get("/getAllSessionInfo/:userId", async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.params;
    if (!userId) {
      return fail(res, "userId is required", 400);
    }

    let snap;
    try {
      snap = await db
        .collection("sessions")
        .where("userId", "==", String(userId))
        .orderBy("startedAt", "desc")
        .get();
    } catch (_e) {
      try {
        snap = await db
          .collection("sessions")
          .where("userId", "==", String(userId))
          .orderBy("createdAt", "desc")
          .get();
      } catch (_e2) {
        snap = await db.collection("sessions").where("userId", "==", String(userId)).get();
      }
    }

    const sessions = snap.docs.map((doc) => mapSessionDoc(doc));
    return ok(res, { userId, count: sessions.length, sessions });
  } catch (error) {
    return fail(res, "Failed to fetch session list", 500, safeError(error));
  }
});

app.get("/sessionInfo/:sessionId", async (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.params;
    const doc = await db.collection("sessions").doc(sessionId).get();
    if (!doc.exists) {
      return fail(res, "Session not found", 404);
    }
    return ok(res, mapSessionDoc(doc));
  } catch (error) {
    return fail(res, "Failed to fetch session", 500, safeError(error));
  }
});

app.patch("/devices/:deviceId/owner", async (req, res) => {
  try {
    const db = getDb();
    const { deviceId } = req.params;
    const { userId } = req.body || {};

    if (!deviceId) {
      return fail(res, "deviceId is required", 400);
    }
    if (!userId) {
      return fail(res, "userId is required", 400);
    }

    const updates = {
      ownerUserId: String(userId),
      ownerUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("devices").doc(String(deviceId)).set(updates, { merge: true });
    const updatedDoc = await db.collection("devices").doc(String(deviceId)).get();

    return ok(res, {
      deviceId: String(deviceId),
      ownerUserId: updatedDoc.data()?.ownerUserId || String(userId),
    });
  } catch (error) {
    return fail(res, "Failed to set device owner", 500, safeError(error));
  }
});

app.get("/live", async (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.query;
    const limitValue = Number(req.query.limit || 200);
    const safeLimit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 1000) : 200;

    if (!sessionId) {
      return fail(res, "sessionId query param is required", 400);
    }

    let query = db.collection("sessions").doc(String(sessionId)).collection("liveData").orderBy("timeSinceStart", "asc").limit(safeLimit);
    let snap;
    try {
      snap = await query.get();
    } catch (_e) {
      query = db.collection("sessions").doc(String(sessionId)).collection("liveData").limit(safeLimit);
      snap = await query.get();
    }

    const liveData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return ok(res, { sessionId, count: liveData.length, liveData });
  } catch (error) {
    return fail(res, "Failed to fetch live data", 500, safeError(error));
  }
});

app.get("/live/current", async (req, res) => {
  try {
    const db = getDb();
    const { deviceId } = req.query;

    if (!deviceId) {
      return fail(res, "deviceId query param is required", 400);
    }

    const deviceDoc = await db.collection("devices").doc(String(deviceId)).get();
    const currentSessionId = deviceDoc.exists ? deviceDoc.data()?.currentSessionId : null;

    if (!currentSessionId) {
      return ok(res, { deviceId: String(deviceId), sessionId: null, count: 0, liveData: [] });
    }

    let query = db.collection("sessions").doc(String(currentSessionId)).collection("liveData").orderBy("timeSinceStart", "asc");
    let snap;
    try {
      snap = await query.get();
    } catch (_e) {
      query = db.collection("sessions").doc(String(currentSessionId)).collection("liveData");
      snap = await query.get();
    }

    const liveData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return ok(res, { deviceId: String(deviceId), sessionId: String(currentSessionId), count: liveData.length, liveData });
  } catch (error) {
    return fail(res, "Failed to fetch current session live data", 500, safeError(error));
  }
});

app.patch("/sessionInfo/:sessionId", async (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.params;
    const { description, comments } = req.body || {};

    if (description === undefined && comments === undefined) {
      return fail(res, "At least one of description or comments is required", 400);
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (description !== undefined) {
      updates.description = description;
    }

    if (comments !== undefined) {
      if (Array.isArray(comments)) {
        updates.comments = comments;
      } else if (typeof comments === "string") {
        updates.comments = [comments];
      } else {
        return fail(res, "comments must be an array or a string", 400);
      }
    }

    await db.collection("sessions").doc(sessionId).set(updates, { merge: true });
    const updated = await db.collection("sessions").doc(sessionId).get();
    return ok(res, mapSessionDoc(updated));
  } catch (error) {
    return fail(res, "Failed to update session", 500, safeError(error));
  }
});

exports.api = onRequest({ region: "us-central1" }, app);
