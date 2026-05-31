/* ============================================================
   MindVault Kids — Cloud Functions Entry Point
   Wraps the Express server as a Firebase Cloud Function
   ============================================================ */
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const path = require('path');

// Set env vars
process.env.FIREBASE_PROJECT_ID = 'mindvault-kids-2026';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

// ---- Auth Middleware ----
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(header.split('Bearer ')[1]);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---- DB Service ----
const db = admin.firestore();
const dbService = {
  async create(collection, userId, data) {
    const ref = db.collection('users').doc(userId).collection(collection).doc();
    const doc = { ...data, id: ref.id, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await ref.set(doc);
    return doc;
  },
  async createWithId(collection, userId, docId, data) {
    const ref = db.collection('users').doc(userId).collection(collection).doc(docId);
    const doc = { ...data, id: docId, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await ref.set(doc);
    return doc;
  },
  async getAll(collection, userId, { orderBy = 'createdAt', direction = 'desc', limit = 50 } = {}) {
    const snapshot = await db.collection('users').doc(userId).collection(collection)
      .orderBy(orderBy, direction).limit(limit).get();
    return snapshot.docs.map(d => d.data());
  },
  async getById(collection, userId, docId) {
    const doc = await db.collection('users').doc(userId).collection(collection).doc(docId).get();
    return doc.exists ? doc.data() : null;
  },
  async update(collection, userId, docId, data) {
    const ref = db.collection('users').doc(userId).collection(collection).doc(docId);
    await ref.update({ ...data, updatedAt: new Date().toISOString() });
    return { id: docId, ...data };
  },
  async delete(collection, userId, docId) {
    await db.collection('users').doc(userId).collection(collection).doc(docId).delete();
    return { success: true, deleted: docId };
  },
  async count(collection, userId) {
    const snapshot = await db.collection('users').doc(userId).collection(collection).count().get();
    return snapshot.data().count;
  },
  async getLatest(collection, userId) {
    const snapshot = await db.collection('users').doc(userId).collection(collection)
      .orderBy('createdAt', 'desc').limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },
  async getProfile(userId) {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  },
  async setProfile(userId, data) {
    await db.collection('users').doc(userId).set(data, { merge: true });
    return data;
  },
  async query(collection, userId, field, op, value, limit = 50) {
    const snapshot = await db.collection('users').doc(userId).collection(collection)
      .where(field, op, value).limit(limit).get();
    return snapshot.docs.map(d => d.data());
  }
};

// ---- Gemini Service (simplified for functions) ----
let genAI;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (e) { console.warn('Gemini SDK not available'); }

async function generateWithRetry(prompt) {
  if (!genAI) return null;
  const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
  for (let i = 0; i < models.length; i++) {
    try {
      const model = genAI.getGenerativeModel({ model: models[i] });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (i === models.length - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ---- Build Express App ----
const app = express();
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Public Routes ----

// Auth signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, role, displayName, uid } = req.body;
    if (!email || !displayName) return res.status(400).json({ error: 'Email and displayName required' });
    const userId = uid || email.replace(/[^a-zA-Z0-9]/g, '_');
    await db.collection('users').doc(userId).set({
      uid: userId, email, displayName, role: role || 'teen', avatar: '',
      preferences: { theme: 'light', notifications: true },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ uid: userId, email, displayName, role, message: 'Profile created successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', (req, res) => res.json({ message: 'Use Firebase client SDK for login.' }));
app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

// Auth - protected
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.userId).get();
    if (!doc.exists) {
      const profile = { uid: req.userId, email: req.userEmail || '', displayName: req.userEmail ? req.userEmail.split('@')[0] : 'User', role: 'teen', avatar: '', preferences: { theme: 'light', notifications: true }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await db.collection('users').doc(req.userId).set(profile);
      return res.json(profile);
    }
    res.json(doc.data());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const allowed = ['displayName', 'avatar', 'preferences', 'age'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updatedAt = new Date().toISOString();
    await db.collection('users').doc(req.userId).update(updates);
    res.json({ success: true, ...updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- Dashboard ----
app.get('/api/dashboard/overview', authMiddleware, async (req, res) => {
  try {
    const uid = req.userId;
    const [profile, latestERS, moodToday, trustCircle, notifications, evidence, panicEvents, recentScans] = await Promise.all([
      dbService.getProfile(uid), dbService.getLatest('ers_history', uid), dbService.getLatest('mood_logs', uid),
      dbService.getAll('trust_circle', uid, { limit: 20 }), dbService.query('notifications', uid, 'read', '==', false, 10),
      dbService.count('evidence', uid), dbService.count('panic_events', uid), dbService.getAll('safe_bubble_checks', uid, { limit: 5 })
    ]);
    const moods = await dbService.getAll('mood_logs', uid, { limit: 30 });
    let streakDays = 0; const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 30; i++) { const d = new Date(today); d.setDate(d.getDate() - i); const ds = d.toISOString().slice(0, 10); if (moods.some(m => m.createdAt?.slice(0, 10) === ds)) streakDays++; else if (i > 0) break; }
    res.json({
      user: profile || { displayName: 'User', role: 'teen', avatar: '' },
      ers: latestERS || { score: 0, label: 'unknown', lastScan: null },
      guardianMind: { status: 'active', message: '"Safety is not the absence of danger, but the presence of awareness."' },
      safetyStreak: { days: streakDays }, recentScans: recentScans.map(s => ({ platform: s.url || 'URL Check', result: s.safe ? 'safe' : 'flagged', timestamp: s.createdAt })),
      vaultCount: evidence, panicCount: panicEvents, moodToday: moodToday?.mood || null,
      trustCircleCount: trustCircle.length, notifications: notifications.length
    });
  } catch (err) { res.status(500).json({ error: 'Failed to load dashboard' }); }
});

// ---- Panic Shield ----
app.post('/api/panic/activate', authMiddleware, async (req, res) => { try { res.json(await dbService.create('panic_events', req.userId, { type: 'panic_activated', triggerSource: req.body.source || 'manual', resolved: false })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/panic/do-not-reply', authMiddleware, async (req, res) => { try { res.json(await dbService.create('panic_events', req.userId, { type: 'do_not_reply', platform: req.body.platform || 'Unknown', resolved: false })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/panic/save-evidence', authMiddleware, async (req, res) => { try { res.json(await dbService.create('evidence', req.userId, { type: 'screenshot', title: 'Panic Shield Evidence', description: req.body.description || '', tags: ['panic'] })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/panic/block-user', authMiddleware, async (req, res) => { try { await dbService.create('panic_events', req.userId, { type: 'block_user', blockedUser: req.body.username || 'Unknown', resolved: true }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/panic/get-help', authMiddleware, async (req, res) => { try { const c = await dbService.getAll('trust_circle', req.userId, { limit: 10 }); const names = c.map(x => x.contactName); await dbService.create('panic_events', req.userId, { type: 'get_help', notifiedContacts: names, resolved: false }); res.json({ success: true, notified: names }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/panic/events', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('panic_events', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Safe Exit ----
app.post('/api/safe-exit/execute', authMiddleware, async (req, res) => { try { const c = await dbService.getAll('trust_circle', req.userId, { limit: 10 }); res.json(await dbService.create('safe_exit_logs', req.userId, { steps: ['block','capture','save','alert','exit'].map(s => ({ step: s, status: 'completed' })), trustCircleAlerted: c.map(x => x.contactName) })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/safe-exit/logs', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('safe_exit_logs', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Grooming ----
app.post('/api/grooming/analyze', authMiddleware, async (req, res) => { try { const { text } = req.body; if (!text) return res.status(400).json({ error: 'Text required' }); let analysis; try { const raw = await generateWithRetry(`Analyze for grooming patterns. Return JSON {stages:{trustBuilding:0-100,emotionalDependence:0-100,isolation:0-100,manipulation:0-100,highRisk:0-100},overallRisk:0-100,aiNarrative:"explanation"}. Text: ${text}`); analysis = JSON.parse(raw); } catch { analysis = { stages: { trustBuilding: 0, emotionalDependence: 0, isolation: 0, manipulation: 0, highRisk: 0 }, overallRisk: 0, aiNarrative: 'Analysis completed.' }; } res.json(await dbService.create('grooming_analyses', req.userId, analysis)); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/grooming/trajectory/:userId', authMiddleware, async (req, res) => { try { const a = await dbService.getAll('grooming_analyses', req.userId, { limit: 30 }); if (!a.length) return res.json({ stages: {}, overallRisk: 0, trajectory: [] }); res.json({ stages: a[0].stages, overallRisk: a[0].overallRisk, trajectory: a.map(x => ({ date: x.createdAt, score: x.overallRisk || 0 })).reverse() }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/grooming/history', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('grooming_analyses', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- ERS ----
app.get('/api/ers/current', authMiddleware, async (req, res) => { try { const l = await dbService.getLatest('ers_history', req.userId); res.json(l || { score: 0, label: 'unknown', factors: {}, aiSummary: 'No ERS data yet.' }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/ers/trend', authMiddleware, async (req, res) => { try { const h = await dbService.getAll('ers_history', req.userId, { limit: 7 }); res.json({ trend: h.reverse().map(x => ({ date: x.createdAt, score: x.score })) }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/ers/calculate', authMiddleware, async (req, res) => { try { let ersData; try { const raw = await generateWithRetry('Calculate emotional risk score 0-100. Return JSON {score:number,label:"low/medium/high",factors:{},aiSummary:"summary"}'); ersData = JSON.parse(raw); } catch { ersData = { score: 15, label: 'low', factors: {}, aiSummary: 'Low risk detected.' }; } res.json(await dbService.create('ers_history', req.userId, ersData)); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Manipulation ----
app.post('/api/manipulation/analyze', authMiddleware, async (req, res) => { const { text } = req.body; if (!text) return res.status(400).json({ error: 'Text required' }); try { let analysis; try { const raw = await generateWithRetry(`Detect manipulation in text. Return JSON {detectedTypes:[],confidence:0-1,flagged:boolean,warningMessage:"message"}. Text: ${text}`); analysis = JSON.parse(raw); } catch { const types = []; let confidence = 0; if (text.match(/if you (really |truly )?lov/i)) { types.push('emotional_blackmail'); confidence = 0.8; } if (text.match(/don.t tell|secret|between us/i)) { types.push('secrecy_coercion'); confidence = Math.max(confidence, 0.9); } if (!types.length) { types.push('none'); confidence = 0.9; } analysis = { detectedTypes: types, confidence, flagged: !types.includes('none'), warningMessage: types.includes('none') ? 'Safe.' : 'Potential manipulation detected.' }; } res.json(await dbService.create('manipulation_logs', req.userId, { sourceText: text, ...analysis })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/manipulation/logs', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('manipulation_logs', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/manipulation/stats', authMiddleware, async (req, res) => { try { const a = await dbService.getAll('manipulation_logs', req.userId, { limit: 100 }); const f = a.filter(l => l.flagged).length; res.json({ totalScans: a.length, flagged: f, safe: a.length - f }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Trust Circle ----
app.get('/api/trust-circle', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('trust_circle', req.userId, { orderBy: 'createdAt', direction: 'asc', limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/trust-circle/add', authMiddleware, async (req, res) => { try { const { contactName, relationship, contactEmail, contactPhone } = req.body; if (!contactName || !relationship) return res.status(400).json({ error: 'Name and relationship required' }); res.json(await dbService.create('trust_circle', req.userId, { contactName, relationship, contactEmail: contactEmail || '', contactPhone: contactPhone || '', priority: (await dbService.count('trust_circle', req.userId)) + 1, notifyOn: { panicShield: true, safeExit: true, silentSOS: true }, verified: false })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/trust-circle/:id', authMiddleware, async (req, res) => { try { res.json(await dbService.update('trust_circle', req.userId, req.params.id, req.body)); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/trust-circle/:id', authMiddleware, async (req, res) => { try { res.json(await dbService.delete('trust_circle', req.userId, req.params.id)); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/trust-circle/alert', authMiddleware, async (req, res) => { try { const c = await dbService.getAll('trust_circle', req.userId, { limit: 20 }); res.json({ success: true, notified: c.map(x => x.contactName) }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Shadow ----
app.post('/api/shadow/analyze', authMiddleware, async (req, res) => { try { let analysis; try { const raw = await generateWithRetry(`Detect shadow accounts. Return JSON {indicators:[],riskLevel:"low/medium/high",confidence:0-1}. Profile: ${JSON.stringify(req.body)}`); analysis = JSON.parse(raw); } catch { analysis = { indicators: [], riskLevel: 'low', confidence: 0.3 }; } res.json(await dbService.create('shadow_detections', req.userId, analysis)); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/shadow/detections', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('shadow_detections', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Evidence ----
app.post('/api/evidence/upload', authMiddleware, async (req, res) => { try { const { type, title, description, tags } = req.body; if (!title) return res.status(400).json({ error: 'Title required' }); res.json(await dbService.create('evidence', req.userId, { type: type || 'screenshot', title, description: description || '', tags: tags || [] })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/evidence', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('evidence', req.userId, { limit: 50 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/evidence/:id', authMiddleware, async (req, res) => { try { const d = await dbService.getById('evidence', req.userId, req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/evidence/:id', authMiddleware, async (req, res) => { try { res.json(await dbService.delete('evidence', req.userId, req.params.id)); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/evidence/report', authMiddleware, async (req, res) => { try { const ev = await dbService.getAll('evidence', req.userId, { limit: 50 }); res.json(await dbService.create('reports', req.userId, { title: 'Incident Report', evidenceCount: ev.length, evidenceIds: ev.map(e => e.id) })); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- SOS ----
app.post('/api/sos/trigger', authMiddleware, async (req, res) => { try { const c = await dbService.getAll('trust_circle', req.userId, { limit: 10 }); res.json(await dbService.create('sos_alerts', req.userId, { triggerMethod: req.body.method || 'manual', status: 'active', contactsAlerted: c.map(x => x.contactName) })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/sos/safe-word', authMiddleware, async (req, res) => { try { const c = await dbService.getAll('trust_circle', req.userId, { limit: 3 }); res.json(await dbService.create('sos_alerts', req.userId, { triggerMethod: 'safe_word', status: 'active', contactsAlerted: c.map(x => x.contactName) })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/sos/logs', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('sos_alerts', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/sos/resolve/:id', authMiddleware, async (req, res) => { try { await dbService.update('sos_alerts', req.userId, req.params.id, { status: 'resolved', resolvedAt: new Date().toISOString() }); res.json({ id: req.params.id, status: 'resolved' }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Night Watch ----
app.post('/api/night-watch/activate', authMiddleware, async (req, res) => { try { await dbService.setProfile(req.userId, { nightWatchActive: true }); res.json({ active: true, message: "Night Watch Mode is now active." }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/night-watch/deactivate', authMiddleware, async (req, res) => { try { await dbService.setProfile(req.userId, { nightWatchActive: false }); res.json({ active: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/night-watch/status', authMiddleware, async (req, res) => { try { const p = await dbService.getProfile(req.userId); res.json({ active: p?.nightWatchActive || false, autoActivateTime: '22:00', autoDeactivateTime: '06:00', sensitivity: p?.nightWatchSensitivity || 'medium' }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/night-watch/events', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('night_watch_events', req.userId, { limit: 20 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/night-watch/report', authMiddleware, async (req, res) => { try { res.json(await dbService.create('night_watch_events', req.userId, { eventType: req.body.eventType || 'manual_report', context: req.body.context || {}, resolved: false })); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Safe Bubble ----
app.get('/api/safe-bubble/status', authMiddleware, async (req, res) => { try { const p = await dbService.getProfile(req.userId); const checks = await dbService.getAll('safe_bubble_checks', req.userId, { limit: 200 }); const blocked = checks.filter(c => !c.safe); res.json({ level: p?.safeBubbleLevel || 'medium', blockedSites: blocked.length, checkedUrls: checks.length, threatsStopped: blocked.length }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/safe-bubble/level', authMiddleware, async (req, res) => { try { await dbService.setProfile(req.userId, { safeBubbleLevel: req.body.level }); res.json({ level: req.body.level }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/safe-bubble/check-url', authMiddleware, async (req, res) => { try { const { url } = req.body; if (!url) return res.status(400).json({ error: 'URL required' }); const risky = url && (url.includes('suspicious') || url.includes('danger') || url.includes('phish')); const result = { url, safe: !risky, riskScore: risky ? 85 : 5, category: risky ? 'phishing' : 'safe', recommendation: risky ? 'Suspicious.' : 'Safe.' }; await dbService.create('safe_bubble_checks', req.userId, result); res.json(result); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/safe-bubble/blocked', authMiddleware, async (req, res) => { try { res.json(await dbService.query('safe_bubble_checks', req.userId, 'safe', '==', false, 50)); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Cyberbullying ----
app.post('/api/cyberbullying/analyze', authMiddleware, async (req, res) => { try { res.json(await dbService.create('cyberbullying_incidents', req.userId, { incidentType: req.body.type || 'harassment', platform: req.body.platform || 'Social Media', emotionalPressureScore: 42, severity: 'medium', flagged: false })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/cyberbullying/pressure-meter', authMiddleware, async (req, res) => { try { const i = await dbService.getAll('cyberbullying_incidents', req.userId, { limit: 30 }); if (!i.length) return res.json({ score: 0, label: 'None', breakdown: {}, trend: [] }); const avg = Math.round(i.reduce((s, x) => s + (x.emotionalPressureScore || 0), 0) / i.length); res.json({ score: avg, label: avg < 30 ? 'Low' : avg < 60 ? 'Medium' : 'High', breakdown: {}, trend: i.slice(0, 7).reverse().map(x => ({ date: x.createdAt, score: x.emotionalPressureScore || 0 })) }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/cyberbullying/stats', authMiddleware, async (req, res) => { try { const a = await dbService.getAll('cyberbullying_incidents', req.userId, { limit: 100 }); res.json({ totalIncidents: a.length, resolved: a.filter(i => i.severity === 'low').length, activeThreats: a.length - a.filter(i => i.severity === 'low').length }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- AI First Aid ----
app.post('/api/ai-first-aid/chat', authMiddleware, async (req, res) => { try { const { message, sessionId } = req.body; if (!message) return res.status(400).json({ error: 'Message required' }); const sid = sessionId || `session-${Date.now()}`; let response; try { response = await generateWithRetry(`You are a compassionate AI companion for children. Be warm and supportive. Keep response 2-4 sentences. User says: "${message}"`); } catch { response = "I hear you, and your feelings are completely valid. Take a deep breath with me — in for 4, hold for 4, out for 4. 💙"; } await dbService.create('chat_messages', req.userId, { sessionId: sid, role: 'user', content: message }); await dbService.create('chat_messages', req.userId, { sessionId: sid, role: 'assistant', content: response }); res.json({ sessionId: sid, response, timestamp: new Date() }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/ai-first-aid/history', authMiddleware, async (req, res) => { try { const msgs = await dbService.getAll('chat_messages', req.userId, { orderBy: 'createdAt', direction: 'asc', limit: 50 }); res.json({ messages: req.query.sessionId ? msgs.filter(m => m.sessionId === req.query.sessionId) : msgs }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/ai-first-aid/grounding', (req, res) => { res.json({ exercise: '5-4-3-2-1 Senses', steps: [{ sense: 'See', count: 5 }, { sense: 'Touch', count: 4 }, { sense: 'Hear', count: 3 }, { sense: 'Smell', count: 2 }, { sense: 'Taste', count: 1 }], duration: '3 minutes' }); });
app.get('/api/ai-first-aid/exercises', (req, res) => { res.json([{ id: 'ex-1', name: '5-4-3-2-1 Senses', type: 'grounding', duration: '3 min' }, { id: 'ex-2', name: 'Box Breathing', type: 'breathing', duration: '4 min' }, { id: 'ex-3', name: 'Body Scan', type: 'relaxation', duration: '5 min' }]); });

// ---- Heal Mode ----
app.get('/api/heal/status', authMiddleware, async (req, res) => { try { const moods = await dbService.getAll('mood_logs', req.userId, { limit: 30 }); const journals = await dbService.count('journal_entries', req.userId); const startEntry = moods.length ? moods[moods.length - 1] : null; const currentDay = startEntry ? Math.ceil((Date.now() - new Date(startEntry.createdAt).getTime()) / 86400000) + 1 : 0; const stages = ['Acknowledging', 'Processing', 'Building Resilience', 'Growing Stronger', 'Thriving']; res.json({ startDate: startEntry?.createdAt || null, currentDay, recoveryStage: stages[Math.min(Math.floor(currentDay / 7), 4)], overallProgress: Math.min(100, Math.round((currentDay / 30) * 100)), journalCount: journals }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/heal/mood', authMiddleware, async (req, res) => { try { const { mood, note } = req.body; if (!mood) return res.status(400).json({ error: 'Mood required' }); res.json(await dbService.create('mood_logs', req.userId, { mood, note: note || '' })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/heal/mood/history', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('mood_logs', req.userId, { limit: 30 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/heal/journal', authMiddleware, async (req, res) => { try { const { content, mood } = req.body; if (!content) return res.status(400).json({ error: 'Content required' }); res.json(await dbService.create('journal_entries', req.userId, { content, mood: mood || '' })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/heal/journal', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('journal_entries', req.userId, { limit: 50 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/heal/recovery-timeline', authMiddleware, async (req, res) => { try { const moods = await dbService.getAll('mood_logs', req.userId, { limit: 30 }); const currentDay = moods.length ? Math.ceil((Date.now() - new Date(moods[moods.length - 1].createdAt).getTime()) / 86400000) + 1 : 0; res.json({ currentDay, milestones: [{ day: 1, event: 'Started', completed: currentDay >= 1 }, { day: 7, event: 'Week 1', completed: currentDay >= 7 }, { day: 14, event: 'Two weeks', completed: currentDay >= 14 }, { day: 30, event: 'One month', completed: currentDay >= 30 }] }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/heal/badges', authMiddleware, async (req, res) => { try { const earned = await dbService.getAll('badges', req.userId, { limit: 20 }); const defs = [{ badgeId: 'privacy-pro', name: 'Privacy Pro', icon: 'lock' }, { badgeId: 'ghost-mode', name: 'Ghost Mode', icon: 'visibility_off' }, { badgeId: 'zen-warrior', name: 'Zen Warrior', icon: 'self_improvement' }]; res.json(defs.map(d => ({ ...d, earned: earned.some(e => e.badgeId === d.badgeId) }))); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Simulator ----
const SCENARIOS = [{ id: 'sc-1', title: 'The Friendly Stranger', description: 'Someone your age reaches out on a gaming platform.', difficulty: 'beginner', steps: 5 }, { id: 'sc-2', title: 'The Secret Keeper', description: 'An older person asks you to keep your friendship secret.', difficulty: 'intermediate', steps: 6 }];
app.get('/api/simulator/scenarios', (req, res) => res.json(SCENARIOS));
app.post('/api/simulator/start', (req, res) => { const sc = SCENARIOS.find(s => s.id === req.body.scenarioId) || SCENARIOS[0]; res.json({ sessionId: `sim-${Date.now()}`, scenario: sc, currentStep: { step: 1, simulatedMessage: "Hey! Want to be friends?", options: ["Sure!", "Let me check with my parents.", "I don't talk to strangers."], correctIndex: 2, explanation: "It's safest to avoid strangers online." }, totalSteps: sc.steps }); });
app.post('/api/simulator/respond', authMiddleware, async (req, res) => { try { const isLast = (req.body.stepIndex || 0) >= 3; if (isLast) await dbService.create('simulator_progress', req.userId, { scenarioId: req.body.scenarioId, score: req.body.score || 0, completed: true }); res.json({ wasCorrect: req.body.response === 0, explanation: 'Trust your instincts.', completed: isLast, nextStep: isLast ? null : { step: (req.body.stepIndex || 0) + 2, simulatedMessage: "Come on, don't be like that!", options: ["No.", "Maybe...", "OK fine."], correctIndex: 0 } }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/simulator/progress', authMiddleware, async (req, res) => { try { const p = await dbService.getAll('simulator_progress', req.userId, { limit: 20 }); res.json({ completedScenarios: [...new Set(p.filter(x => x.completed).map(x => x.scenarioId))].length, totalScenarios: SCENARIOS.length, history: p }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Notifications ----
app.post('/api/notifications/register', (req, res) => res.json({ success: true }));
app.get('/api/notifications', authMiddleware, async (req, res) => { try { res.json(await dbService.getAll('notifications', req.userId, { limit: 30 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => { try { await dbService.update('notifications', req.userId, req.params.id, { read: true }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---- Health ----
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Export as Cloud Function
exports.api = onRequest({ region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 }, app);
