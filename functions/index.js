const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// NOTE:
// Firebase Web API keys are not treated as sensitive secrets.
// For Spark-plan projects (no Secret Manager), you can paste the key below.
// Optional override at runtime: process.env.FIREBASE_WEB_API_KEY
const DEFAULT_FIREBASE_WEB_API_KEY = "";

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

async function createUser(req, res) {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return fail(res, "email and password are required", 400);
    }

    const user = await admin.auth().createUser({ email, password, displayName });

    await db.collection("users").doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return ok(
      res,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
      },
      201,
    );
  } catch (error) {
    return fail(res, "Failed to create user", 500, safeError(error));
  }
}

app.get("/health", (_req, res) => ok(res, { service: "api", status: "up" }));

app.post("/start", async (req, res) => {
  try {
    const { deviceId } = req.body || {};
    if (!deviceId) {
      return fail(res, "deviceId is required", 400);
    }

    const payload = {
      type: "start_session",
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
    const { userId } = req.params;
    const snap = await db.collection("sessions").where("userId", "==", userId).get();
    const sessions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return ok(res, { userId, count: sessions.length, sessions });
  } catch (error) {
    return fail(res, "Failed to fetch session list", 500, safeError(error));
  }
});

app.get("/sessionInfo/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const doc = await db.collection("sessions").doc(sessionId).get();
    if (!doc.exists) {
      return fail(res, "Session not found", 404);
    }
    return ok(res, { id: doc.id, ...doc.data() });
  } catch (error) {
    return fail(res, "Failed to fetch session", 500, safeError(error));
  }
});

app.get("/live", async (req, res) => {
  try {
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

app.patch("/sessionInfo/:sessionId", async (req, res) => {
  try {
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
    return ok(res, { id: updated.id, ...updated.data() });
  } catch (error) {
    return fail(res, "Failed to update session", 500, safeError(error));
  }
});

exports.api = functions.https.onRequest(app);
