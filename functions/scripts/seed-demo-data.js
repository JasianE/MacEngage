#!/usr/bin/env node

/* eslint-disable no-console */



/**

 * Demo data seeder for EngageMint.

 *

 * What it does:

 * 1) Ensures a demo Firebase Auth user exists (and sets known password).

 * 2) Seeds historical session data tied to that demo UID.

 * 3) Generates intentional, insight-oriented engagement patterns for demo storytelling.

 *

 * Usage examples:

 *   npm --prefix functions run seed:demo

 *   npm --prefix functions run seed:demo -- --reset --sessions 10 --days 14 --seed 42

 */



const admin = require("firebase-admin");

const fs = require("fs");

const path = require("path");



function resolveRootPath(...parts) {

  return path.resolve(__dirname, "..", "..", ...parts);

}



function bootstrapLocalFirebaseEnv() {

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {

    const localKey = resolveRootPath("device", "config", "service-account-key.json");

    if (fs.existsSync(localKey)) {

      process.env.GOOGLE_APPLICATION_CREDENTIALS = localKey;

    }

  }



  if (!process.env.GCLOUD_PROJECT && !process.env.GOOGLE_CLOUD_PROJECT) {

    try {

      const firebaseRcPath = resolveRootPath(".firebaserc");

      const firebaseRc = JSON.parse(fs.readFileSync(firebaseRcPath, "utf8"));

      const projectId = firebaseRc?.projects?.default;

      if (projectId) {

        process.env.GCLOUD_PROJECT = projectId;

        process.env.GOOGLE_CLOUD_PROJECT = projectId;

      }

    } catch (_error) {

      // ignore: if .firebaserc is unavailable we'll rely on ambient env

    }

  }

}



bootstrapLocalFirebaseEnv();



if (!admin.apps.length) {

  admin.initializeApp();

}



const db = admin.firestore();



const DEFAULTS = {

  email: "demo@macengage.app",

  password: "DemoPass!2026",

  displayName: "EngageMint Demo Teacher",

  sessions: 10,

  durationMinutes: 35,

  tickIntervalSeconds: 5,

  days: 14,

  seed: 42,

  reset: false,

};



function parseArgs(argv) {

  const args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {

    const token = argv[i];

    const next = argv[i + 1];



    if (token === "--email" && next) args.email = next;

    else if (token === "--password" && next) args.password = next;

    else if (token === "--display-name" && next) args.displayName = next;

    else if (token === "--sessions" && next) args.sessions = Number(next);

    else if (token === "--duration" && next) args.durationMinutes = Number(next);

    else if (token === "--tick" && next) args.tickIntervalSeconds = Number(next);

    else if (token === "--days" && next) args.days = Number(next);

    else if (token === "--seed" && next) args.seed = Number(next);

    else if (token === "--reset") args.reset = true;

  }

  return args;

}



function mulberry32(seed) {

  let t = seed >>> 0;

  return function rand() {

    t += 0x6d2b79f5;

    let r = Math.imul(t ^ (t >>> 15), 1 | t);

    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);

    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;

  };

}



function clamp(v, min = 0, max = 100) {

  return Math.max(min, Math.min(max, v));

}



function gaussian(rand) {

  // Box-Muller transform

  let u = 0;

  let v = 0;

  while (u === 0) u = rand();

  while (v === 0) v = rand();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

}



function formatDateYYYYMMDD(date) {

  const y = date.getUTCFullYear();

  const m = String(date.getUTCMonth() + 1).padStart(2, "0");

  const d = String(date.getUTCDate()).padStart(2, "0");

  return `${y}${m}${d}`;

}



const TEMPLATE_LIBRARY = [

  {

    key: "slow_start_recovery",

    title: "Slow Start, Strong Recovery",

    insight:

      "A warm-up/check-in appears to improve engagement after the first 10 minutes.",

    shape: (n, rand) => {

      const vals = [];

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const baseline = 50;

        const rise = 30 / (1 + Math.exp(-10 * (p - 0.35))); // logistic rise

        const jitter = gaussian(rand) * 2.5;

        vals.push(clamp(baseline + rise + jitter));

      }

      return vals;

    },

  },

  {

    key: "mid_dip_rebound",

    title: "Mid-Session Dip + Rebound",

    insight:

      "There is a visible attention dip mid-way; an activity break likely helps engagement rebound.",

    shape: (n, rand) => {

      const vals = [];

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const base = 72;

        const dip = -22 * Math.exp(-Math.pow((p - 0.52) / 0.13, 2));

        const rebound = p > 0.62 ? 10 * (p - 0.62) / 0.38 : 0;

        const jitter = gaussian(rand) * 2.2;

        vals.push(clamp(base + dip + rebound + jitter));

      }

      return vals;

    },

  },

  {

    key: "end_fatigue",

    title: "End-of-Class Fatigue",

    insight:

      "Engagement falls in the final segment; pacing a recap/interactive close could help.",

    shape: (n, rand) => {

      const vals = [];

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const base = 76;

        const fatigue = p > 0.7 ? -26 * (p - 0.7) / 0.3 : 0;

        const jitter = gaussian(rand) * 2.4;

        vals.push(clamp(base + fatigue + jitter));

      }

      return vals;

    },

  },

  {

    key: "high_volatility",

    title: "High Volatility Session",

    insight:

      "Average engagement is acceptable, but volatility suggests inconsistent classroom flow.",

    shape: (n, rand) => {

      const vals = [];

      const cycles = 5 + Math.floor(rand() * 3);

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const wave = 16 * Math.sin(2 * Math.PI * cycles * p);

        const base = 66;

        const jitter = gaussian(rand) * 3.0;

        vals.push(clamp(base + wave + jitter));

      }

      return vals;

    },

  },

  {

    key: "intervention_before",

    title: "Intervention Baseline (Before)",

    insight:

      "Baseline session shows repeated dips and lower sustained engagement.",

    shape: (n, rand) => {

      const vals = [];

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const base = 62;

        const dip1 = -16 * Math.exp(-Math.pow((p - 0.30) / 0.08, 2));

        const dip2 = -18 * Math.exp(-Math.pow((p - 0.68) / 0.09, 2));

        const jitter = gaussian(rand) * 2.3;

        vals.push(clamp(base + dip1 + dip2 + jitter));

      }

      return vals;

    },

  },

  {

    key: "intervention_after",

    title: "Intervention Follow-Up (After)",

    insight:

      "Post-intervention session shows fewer dips and a stronger sustained engagement level.",

    shape: (n, rand) => {

      const vals = [];

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const base = 74;

        const dip1 = -8 * Math.exp(-Math.pow((p - 0.30) / 0.09, 2));

        const dip2 = -7 * Math.exp(-Math.pow((p - 0.68) / 0.10, 2));

        const jitter = gaussian(rand) * 2.0;

        vals.push(clamp(base + dip1 + dip2 + jitter));

      }

      return vals;

    },

  },

  {

    key: "weekly_improvement",

    title: "Week-over-Week Improvement",

    insight:

      "Recent sessions trend upward, suggesting teaching adjustments are improving outcomes.",

    shape: (n, rand, sessionOrdinal, sessionCount) => {

      const vals = [];

      const cohortLift = (sessionOrdinal / Math.max(1, sessionCount - 1)) * 12;

      for (let i = 0; i < n; i += 1) {

        const p = i / Math.max(1, n - 1);

        const inSessionSlope = 4 * p;

        const base = 58 + cohortLift;

        const jitter = gaussian(rand) * 2.2;

        vals.push(clamp(base + inSessionSlope + jitter));

      }

      return vals;

    },

  },

];



const COURSE_CODES = ["MAT135", "ECE105"];



const TEACHER_NOTES_BY_COURSE_AND_PATTERN = {

  MAT135: {

    slow_start_recovery: [

      "Started with limit review, then moved into derivative rules practice and students became more engaged.",

      "First 10 minutes were recap-heavy on continuity; participation improved during derivative examples.",

    ],

    mid_dip_rebound: [

      "Class dipped during chain rule proofs, then picked back up once we switched to worked optimization problems.",

      "Energy dropped mid-lesson on implicit differentiation, but recovered during group whiteboard practice.",

    ],

    end_fatigue: [

      "Covered related rates and optimization; the last segment felt rushed and students looked tired.",

      "Good derivative practice overall, but focus dropped near the end during the final application question.",

    ],

    high_volatility: [

      "Lesson alternated between lecture and quick quizzes on derivatives, which created uneven momentum.",

      "Students were on and off during mixed limit/derivative review; transitions could be smoother next time.",

    ],

    intervention_before: [

      "This was a lecture-heavy MAT135 class on optimization setup; students struggled to stay consistently focused.",

      "Before trying new activities, the related rates lesson felt passive and participation was limited.",

    ],

    intervention_after: [

      "Added peer problem-solving for optimization and students stayed involved longer than previous classes.",

      "Using short derivative check-ins throughout the class improved participation compared to earlier sessions.",

    ],

    weekly_improvement: [

      "Across this week of derivatives and applications, students showed stronger consistency with each class.",

      "MAT135 practice flow improved over the week, especially once warm-up questions were added.",

    ],

  },

  ECE105: {

    slow_start_recovery: [

      "Started with basic circuit notation review, then engagement improved during hands-on breadboard work.",

      "The intro coding recap was quiet, but students became active once we began the microcontroller lab.",

    ],

    mid_dip_rebound: [

      "Attention dipped during logic-gate theory, then improved when we switched to simulation exercises.",

      "Class slowed in the middle while debugging setup issues, then recovered during guided lab checkpoints.",

    ],

    end_fatigue: [

      "Covered circuit analysis and lab coding; focus dropped near the end of the troubleshooting segment.",

      "Solid progress on ECE105 lab objectives, but students were tired in the final wrap-up tasks.",

    ],

    high_volatility: [

      "The lesson jumped between schematic explanation and coding tasks, leading to uneven attention.",

      "ECE105 session had strong moments during demos but dips during longer theory explanations.",

    ],

    intervention_before: [

      "Before revising the lab structure, this class on digital logic had frequent drop-offs in focus.",

      "Initial delivery of circuit fundamentals was too long-form; students disengaged in multiple stretches.",

    ],

    intervention_after: [

      "After adding shorter lab milestones, students stayed more consistent through the coding/circuit tasks.",

      "Breaking the ECE105 lab into timed checkpoints improved focus compared to prior sessions.",

    ],

    weekly_improvement: [

      "This week’s ECE105 sequence on logic and microcontroller basics showed steadier engagement each class.",

      "Participation improved across sessions as students got more comfortable with debugging workflow.",

    ],

  },

};



function buildTemplatePlan(count) {

  // fixed mix order for narrative consistency

  const cycle = [

    "slow_start_recovery",

    "mid_dip_rebound",

    "end_fatigue",

    "high_volatility",

    "intervention_before",

    "intervention_after",

    "weekly_improvement",

  ];

  return Array.from({ length: count }, (_, i) => cycle[i % cycle.length]);

}



function getTemplateByKey(key) {

  return TEMPLATE_LIBRARY.find((t) => t.key === key) || TEMPLATE_LIBRARY[0];

}



function pickCourseCode(sessionIndex) {

  return COURSE_CODES[sessionIndex % COURSE_CODES.length];

}



function pickTeacherNote(courseCode, patternKey, sessionIndex) {

  const bank = TEACHER_NOTES_BY_COURSE_AND_PATTERN?.[courseCode]?.[patternKey];

  if (!bank || bank.length === 0) {

    return `${courseCode} class notes recorded for this session.`;

  }

  return bank[sessionIndex % bank.length];

}



async function ensureDemoUser({ email, password, displayName }) {

  let user;

  try {

    user = await admin.auth().getUserByEmail(email);

    user = await admin.auth().updateUser(user.uid, { password, displayName });

    console.log(`ℹ️  Demo user exists. Password/displayName refreshed: ${email}`);

  } catch (error) {

    if (error && error.code === "auth/user-not-found") {

      user = await admin.auth().createUser({ email, password, displayName });

      console.log(`✅ Created demo auth user: ${email}`);

    } else {

      throw error;

    }

  }



  await db.collection("users").doc(user.uid).set(

    {

      uid: user.uid,

      email,

      displayName,

      role: "demo",

      isDemo: true,

      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

      createdAt: admin.firestore.FieldValue.serverTimestamp(),

    },

    { merge: true },

  );



  return user;

}



async function deleteSessionWithChildren(sessionId) {

  const sessionRef = db.collection("sessions").doc(sessionId);

  const liveSnap = await sessionRef.collection("liveData").get();

  let batch = db.batch();

  let opCount = 0;



  for (const doc of liveSnap.docs) {

    batch.delete(doc.ref);

    opCount += 1;

    if (opCount >= 450) {

      await batch.commit();

      batch = db.batch();

      opCount = 0;

    }

  }



  batch.delete(sessionRef);

  await batch.commit();

}



async function resetDemoSessionsForUser(uid) {

  const snap = await db

    .collection("sessions")

    .where("userId", "==", uid)

    .where("isDemo", "==", true)

    .get();



  if (snap.empty) {

    console.log("ℹ️  No existing demo sessions to reset.");

    return;

  }



  for (const doc of snap.docs) {

    await deleteSessionWithChildren(doc.id);

  }

  console.log(`🧹 Reset complete. Deleted ${snap.size} demo sessions.`);

}



async function writeSessionAndTicks({

  uid,

  sessionId,

  sessionTitle,

  sessionDate,

  insight,

  scores,

  startTime,

  tickIntervalSeconds,

  templateKey,

  ordinal,

}) {

  const avg = scores.reduce((acc, v) => acc + v, 0) / Math.max(1, scores.length);



  await db.collection("sessions").doc(sessionId).set({

    title: sessionTitle,

    name: sessionTitle,

    date: sessionDate,

    overallScore: Number(avg.toFixed(1)),

    comments: [insight],

    userId: uid,

    isDemo: true,

    seedVersion: "v1-patterned",

    seededAt: admin.firestore.FieldValue.serverTimestamp(),

    patternKey: templateKey,

    sessionOrdinal: ordinal,

  });



  let batch = db.batch();

  let opCount = 0;



  for (let i = 0; i < scores.length; i += 1) {

    const tickRef = db

      .collection("sessions")

      .doc(sessionId)

      .collection("liveData")

      .doc(`tick_${String(i + 1).padStart(4, "0")}`);

    batch.set(tickRef, {

      timeSinceStart: i * tickIntervalSeconds,

      engagementScore: scores[i],

      timestamp: new Date(startTime.getTime() + i * tickIntervalSeconds * 1000).toISOString(),

    });

    opCount += 1;



    if (opCount >= 450) {

      await batch.commit();

      batch = db.batch();

      opCount = 0;

    }

  }



  if (opCount > 0) {

    await batch.commit();

  }



  return Number(avg.toFixed(1));

}



async function main() {

  const args = parseArgs(process.argv.slice(2));

  const random = mulberry32(args.seed);



  if (!args.sessions || args.sessions < 1) {

    throw new Error("--sessions must be >= 1");

  }

  if (!args.durationMinutes || args.durationMinutes < 1) {

    throw new Error("--duration must be >= 1 minute");

  }

  if (!args.tickIntervalSeconds || args.tickIntervalSeconds < 1) {

    throw new Error("--tick must be >= 1 second");

  }



  console.log("\n🚀 EngageMint demo data seeder");

  console.log(`   project: ${process.env.GCLOUD_PROJECT || "(default via ADC)"}`);

  console.log(`   demo email: ${args.email}`);

  console.log(`   sessions: ${args.sessions}`);

  console.log(`   duration: ${args.durationMinutes} min`);

  console.log(`   history window: ${args.days} days\n`);



  const user = await ensureDemoUser(args);



  if (args.reset) {

    await resetDemoSessionsForUser(user.uid);

  }



  const totalTicks = Math.floor((args.durationMinutes * 60) / args.tickIntervalSeconds);

  const now = new Date();

  const templatePlan = buildTemplatePlan(args.sessions);



  const summaryRows = [];



  for (let i = 0; i < args.sessions; i += 1) {

    const template = getTemplateByKey(templatePlan[i]);

    const courseCode = pickCourseCode(i);

    const dayOffset = Math.floor(((args.days - 1) * i) / Math.max(1, args.sessions - 1));

    const minutesOffset = (i * 37) % (24 * 60); // deterministic spread across day

    const sessionStart = new Date(now.getTime() - ((args.days - dayOffset) * 24 * 60 + minutesOffset) * 60 * 1000);



    const rawScores = template.shape(totalTicks, random, i, args.sessions);

    const scores = rawScores.map((s) => Math.round(clamp(s)));

    const teacherNote = pickTeacherNote(courseCode, template.key, i);

    const ymd = formatDateYYYYMMDD(sessionStart);

    const sessionId = `demo_${ymd}_${String(i + 1).padStart(2, "0")}_${template.key}`;

    const sessionTitle = courseCode;



    const avg = await writeSessionAndTicks({

      uid: user.uid,

      sessionId,

      sessionTitle,

      sessionDate: sessionStart.toISOString(),

      insight: teacherNote,

      scores,

      startTime: sessionStart,

      tickIntervalSeconds: args.tickIntervalSeconds,

      templateKey: template.key,

      ordinal: i + 1,

    });



    summaryRows.push({

      sessionId,

      title: sessionTitle,

      avg,

    });

    console.log(`✅ [${i + 1}/${args.sessions}] ${sessionId} | avg=${avg}`);

  }



  console.log("\n📌 Demo account ready");

  console.log(`   email: ${args.email}`);

  console.log(`   password: ${args.password}`);

  console.log(`   uid: ${user.uid}\n`);



  console.log("📊 Seeded sessions:");

  summaryRows.forEach((row) => {

    console.log(`   - ${row.sessionId} (${row.title}) avg=${row.avg}`);

  });

  console.log("\nDone. You can now sign in with the demo account and view historical sessions.");

}



main().catch((error) => {

  console.error("\n❌ Seeder failed:", error.message || error);

  process.exit(1);

});

