const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

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

function extractEngagementPoint(point = {}) {
  const second = point?.timeSinceStart ?? point?.["time-since-session-started"];
  const score = point?.engagementScore ?? point?.["engagement-score"];

  if (typeof second !== "number" || typeof score !== "number") {
    return null;
  }

  return {
    second: Math.max(0, second),
    score: Math.max(0, Math.min(100, score)),
  };
}

function toMinuteBuckets(liveData = []) {
  const bucketMap = new Map();

  liveData.forEach((item) => {
    const point = extractEngagementPoint(item);
    if (!point) return;

    const minute = Math.floor(point.second / 60);
    const previous = bucketMap.get(minute) || { total: 0, count: 0 };
    previous.total += point.score;
    previous.count += 1;
    bucketMap.set(minute, previous);
  });

  return Array.from(bucketMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([minute, aggregate]) => ({
      minute,
      avgScore: aggregate.count > 0 ? Math.round(aggregate.total / aggregate.count) : 0,
    }));
}

function computeSessionStats(session = {}, liveData = []) {
  const points = liveData.map(extractEngagementPoint).filter(Boolean);
  const title = session?.title || `Session ${String(session?.id || "").slice(0, 8)}`;
  const avgFromSession = typeof session?.overallScore === "number" ? Math.round(session.overallScore) : null;

  if (points.length === 0) {
    return {
      title,
      averageScore: avgFromSession ?? 0,
      peakMinute: 0,
      peakScore: avgFromSession ?? 0,
      dipMinute: 0,
      dipScore: avgFromSession ?? 0,
      durationMinutes: 0,
      minuteBuckets: [],
    };
  }

  const averageScore = Math.round(points.reduce((sum, p) => sum + p.score, 0) / points.length);
  const peak = points.reduce((best, p) => (p.score > best.score ? p : best), points[0]);
  const dip = points.reduce((best, p) => (p.score < best.score ? p : best), points[0]);
  const durationMinutes = Math.max(1, Math.round(Math.max(...points.map((p) => p.second)) / 60));

  return {
    title,
    averageScore,
    peakMinute: Math.round(peak.second / 60),
    peakScore: Math.round(peak.score),
    dipMinute: Math.round(dip.second / 60),
    dipScore: Math.round(dip.score),
    durationMinutes,
    minuteBuckets: toMinuteBuckets(liveData),
  };
}

function parseJsonFromText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    return null;
  }
}

function asStringArray(value, maxLength = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxLength);
}

function fallbackSessionInsight(stats, session = {}) {
  const comments = Array.isArray(session.comments) ? session.comments : [];
  const keyInsights =
    `Engagement in ${stats.title} averaged ${stats.averageScore}% with a peak of ${stats.peakScore}% around minute ${stats.peakMinute}. ` +
    `The largest dip was ${stats.dipScore}% near minute ${stats.dipMinute}${comments.length ? ", aligning with instructor notes for follow-up." : "."}`;

  const recommendations = [
    `Insert a brief interaction before minute ${Math.max(1, stats.dipMinute)} to prevent the mid-session decline.`,
    `Reuse the activity style around minute ${stats.peakMinute}, where engagement reached ${stats.peakScore}%.`,
    "Capture one concrete note during low-focus moments to sharpen next-session planning.",
  ];

  return {
    keyInsights,
    recommendations,
    source: "fallback",
    generatedAt: new Date().toISOString(),
  };
}

function fallbackComparisonInsight(items) {
  const ranked = [...items].sort((a, b) => b.stats.averageScore - a.stats.averageScore);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const scoreDelta = strongest && weakest ? strongest.stats.averageScore - weakest.stats.averageScore : 0;

  const summary = strongest
    ? `${strongest.stats.title} led with an average engagement of ${strongest.stats.averageScore}%, while ${weakest.stats.title} trailed at ${weakest.stats.averageScore}%. The average spread is ${scoreDelta} points, with dips commonly occurring near the ${weakest.stats.dipMinute}-minute mark.`
    : "Select at least one session to generate a comparison summary.";

  return {
    summary,
    recommendations: [
      "Place a high-participation activity 2-5 minutes before each identified dip window.",
      "Move independent work blocks away from each session's lowest-focus interval.",
      "Track one intervention per session and compare week-over-week recapture impact.",
    ],
    metrics: {
      peakCorrelationLabel: strongest ? `${strongest.stats.title} @ ${strongest.stats.peakMinute}m` : "N/A",
      attentionSpanLabel: weakest ? `~${Math.max(10, weakest.stats.dipMinute)} Minutes` : "N/A",
      recaptureRateLabel: `${Math.max(50, 100 - Math.round(scoreDelta * 1.2))}% after intervention`,
    },
    source: "fallback",
    generatedAt: new Date().toISOString(),
  };
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY secret");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
          maxOutputTokens: 700,
        },
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini request failed");
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text)
      .filter(Boolean)
      .join("\n") || "";

  const parsed = parseJsonFromText(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini returned non-JSON response");
  }

  return parsed;
}

function validateSessionInsight(value) {
  if (!value || typeof value !== "object") return null;

  const keyInsights = typeof value.keyInsights === "string" ? value.keyInsights.trim() : "";
  const recommendations = asStringArray(value.recommendations, 5);

  if (!keyInsights || recommendations.length === 0) {
    return null;
  }

  return {
    keyInsights,
    recommendations,
    source: "gemini",
    generatedAt: new Date().toISOString(),
  };
}

function validateComparisonInsight(value) {
  if (!value || typeof value !== "object") return null;

  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  const recommendations = asStringArray(value.recommendations, 6);
  const metrics = value.metrics && typeof value.metrics === "object" ? value.metrics : {};

  const peakCorrelationLabel = typeof metrics.peakCorrelationLabel === "string" ? metrics.peakCorrelationLabel.trim() : "";
  const attentionSpanLabel = typeof metrics.attentionSpanLabel === "string" ? metrics.attentionSpanLabel.trim() : "";
  const recaptureRateLabel = typeof metrics.recaptureRateLabel === "string" ? metrics.recaptureRateLabel.trim() : "";

  if (!summary || recommendations.length === 0) {
    return null;
  }

  return {
    summary,
    recommendations,
    metrics: {
      peakCorrelationLabel: peakCorrelationLabel || "N/A",
      attentionSpanLabel: attentionSpanLabel || "N/A",
      recaptureRateLabel: recaptureRateLabel || "N/A",
    },
    source: "gemini",
    generatedAt: new Date().toISOString(),
  };
}

async function getSessionWithLiveData(sessionId, liveLimit = 1000) {
  const db = getDb();
  const sessionDoc = await db.collection("sessions").doc(String(sessionId)).get();

  if (!sessionDoc.exists) {
    throw new Error("Session not found");
  }

  const session = mapSessionDoc(sessionDoc);

  let liveQuery = db
    .collection("sessions")
    .doc(String(sessionId))
    .collection("liveData")
    .orderBy("timeSinceStart", "asc")
    .limit(Math.min(Math.max(Number(liveLimit) || 500, 1), 2000));

  let liveSnap;
  try {
    liveSnap = await liveQuery.get();
  } catch (_e) {
    liveQuery = db.collection("sessions").doc(String(sessionId)).collection("liveData").limit(500);
    liveSnap = await liveQuery.get();
  }

  return {
    session,
    liveData: liveSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
}

function hashPayload(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildSessionPrompt(session, stats) {
  return [
    "You are an educational engagement analyst.",
    "Return only valid JSON in this shape:",
    "{\"keyInsights\": string, \"recommendations\": string[]}",
    "Constraints:",
    "- keyInsights: 2-4 concise sentences grounded in given numbers",
    "- recommendations: 2-4 practical, classroom-ready actions",
    "- no markdown, no extra keys, no code fences",
    "Data:",
    JSON.stringify(
      {
        session: {
          id: session.id,
          title: stats.title,
          startedAt: session.startedAt,
          overallScore: stats.averageScore,
          comments: Array.isArray(session.comments) ? session.comments.slice(-5) : [],
        },
        engagement: {
          averageScore: stats.averageScore,
          peakMinute: stats.peakMinute,
          peakScore: stats.peakScore,
          dipMinute: stats.dipMinute,
          dipScore: stats.dipScore,
          durationMinutes: stats.durationMinutes,
          minuteBuckets: stats.minuteBuckets,
        },
      },
      null,
      2,
    ),
  ].join("\n");
}

function buildComparisonPrompt(items) {
  return [
    "You are an educational engagement analyst comparing multiple class sessions.",
    "Return only valid JSON in this shape:",
    "{\"summary\": string, \"recommendations\": string[], \"metrics\": {\"peakCorrelationLabel\": string, \"attentionSpanLabel\": string, \"recaptureRateLabel\": string}}",
    "Constraints:",
    "- summary: 3-5 concise sentences with direct comparisons",
    "- recommendations: 3-5 practical interventions",
    "- metrics labels must be short UI-friendly strings",
    "- no markdown, no extra keys, no code fences",
    "Comparison data:",
    JSON.stringify(
      items.map((item) => ({
        sessionId: item.session.id,
        title: item.stats.title,
        averageScore: item.stats.averageScore,
        peakMinute: item.stats.peakMinute,
        peakScore: item.stats.peakScore,
        dipMinute: item.stats.dipMinute,
        dipScore: item.stats.dipScore,
        durationMinutes: item.stats.durationMinutes,
      })),
      null,
      2,
    ),
  ].join("\n");
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

app.post("/ai/session-summary/:sessionId", async (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.params;
    const { forceRefresh } = req.body || {};

    if (!sessionId) {
      return fail(res, "sessionId is required", 400);
    }

    const { session, liveData } = await getSessionWithLiveData(sessionId, 1200);
    const stats = computeSessionStats(session, liveData);

    const cacheKey = hashPayload({
      type: "session-summary-v1",
      sessionId: String(sessionId),
      updatedAt: session.updatedAt || session.endedAt || session.startedAt || null,
      liveCount: liveData.length,
      stats,
    });

    const cacheRef = db
      .collection("sessions")
      .doc(String(sessionId))
      .collection("aiInsights")
      .doc("session-summary");

    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      const cached = cacheDoc.exists ? cacheDoc.data() : null;
      if (cached?.cacheKey === cacheKey && cached?.payload) {
        return ok(res, {
          ...cached.payload,
          cache: { hit: true, key: cacheKey },
        });
      }
    }

    const fallback = fallbackSessionInsight(stats, session);
    const prompt = buildSessionPrompt(session, stats);

    let payload = fallback;
    try {
      const geminiRaw = await callGemini(prompt);
      payload = validateSessionInsight(geminiRaw) || fallback;
    } catch (geminiError) {
      console.warn("[ai/session-summary] Gemini failed; using fallback", {
        sessionId,
        error: safeError(geminiError),
      });
    }

    await cacheRef.set(
      {
        cacheKey,
        payload,
        sessionId: String(sessionId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return ok(res, {
      ...payload,
      cache: { hit: false, key: cacheKey },
    });
  } catch (error) {
    if (String(safeError(error)).toLowerCase().includes("not found")) {
      return fail(res, "Session not found", 404, safeError(error));
    }
    return fail(res, "Failed to generate AI session summary", 500, safeError(error));
  }
});

app.post("/ai/comparison-summary", async (req, res) => {
  try {
    const db = getDb();
    const { sessionIds, forceRefresh } = req.body || {};

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return fail(res, "sessionIds must be a non-empty array", 400);
    }

    const normalizedIds = sessionIds.map((id) => String(id)).filter(Boolean);
    const uniqueIds = Array.from(new Set(normalizedIds)).slice(0, 6);

    const comparisonItems = await Promise.all(
      uniqueIds.map(async (sessionId) => {
        const data = await getSessionWithLiveData(sessionId, 1000);
        return {
          session: data.session,
          liveData: data.liveData,
          stats: computeSessionStats(data.session, data.liveData),
        };
      }),
    );

    const cacheKey = hashPayload({
      type: "comparison-summary-v1",
      sessions: comparisonItems.map((item) => ({
        id: item.session.id,
        updatedAt: item.session.updatedAt || item.session.endedAt || item.session.startedAt || null,
        liveCount: item.liveData.length,
        stats: item.stats,
      })),
    });

    const cacheRef = db.collection("aiComparisonInsights").doc(cacheKey);
    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      const cached = cacheDoc.exists ? cacheDoc.data() : null;
      if (cached?.payload) {
        return ok(res, {
          ...cached.payload,
          cache: { hit: true, key: cacheKey },
        });
      }
    }

    const fallback = fallbackComparisonInsight(comparisonItems);
    const prompt = buildComparisonPrompt(comparisonItems);

    let payload = fallback;
    try {
      const geminiRaw = await callGemini(prompt);
      payload = validateComparisonInsight(geminiRaw) || fallback;
    } catch (geminiError) {
      console.warn("[ai/comparison-summary] Gemini failed; using fallback", {
        sessionIds: uniqueIds,
        error: safeError(geminiError),
      });
    }

    await cacheRef.set(
      {
        cacheKey,
        sessionIds: uniqueIds,
        payload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return ok(res, {
      ...payload,
      cache: { hit: false, key: cacheKey },
    });
  } catch (error) {
    return fail(res, "Failed to generate AI comparison summary", 500, safeError(error));
  }
});

exports.api = onRequest({ region: "us-central1", secrets: ["GEMINI_API_KEY"] }, app);
