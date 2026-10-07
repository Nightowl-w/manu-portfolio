// Vercel serverless function: report visitor to Telegram with clean format & rate-limiting
const TOKEN = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';
const CHAT = process.env.TG_CHAT_ID || '8908879084';

// In-memory rate limiting per IP (10 min cooldown)
const recentVisitors = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;

function cleanupOldIps() {
  const now = Date.now();
  for (const [ip, time] of recentVisitors.entries()) {
    if (now - time > COOLDOWN_MS) recentVisitors.delete(ip);
  }
}

function parseUserAgent(ua) {
  let os = '';
  let device = '';
  let app = '';
  let browser = '';

  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone/i.test(ua)) {
    const v = ua.match(/cpu iphone os ([0-9_]+)/i);
    os = 'iPhone (iOS ' + (v ? v[1].replace(/_/g, '.') : '') + ')';
  } else if (/ipad/i.test(ua)) {
    os = 'iPad';
  } else if (/android/i.test(ua)) {
    const v = ua.match(/android\s+([0-9\.]+)/i);
    const m = ua.match(/;\s*([^;]+)\s+Build/i);
    os = 'Android ' + (v ? v[1] : '');
    if (m) device = m[1].trim();
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  if (/instagram/i.test(ua)) app = 'Instagram App';
  else if (/fbav|fban/i.test(ua)) app = 'Facebook App';
  else if (/whatsapp/i.test(ua)) app = 'WhatsApp';
  else if (/telegram/i.test(ua)) app = 'Telegram';
  else if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  return { os, device, browser: app || browser || '' };
}

const isInvalid = (v) => {
  if (!v) return true;
  const s = String(v).trim().toLowerCase();
  return (
    s === '' ||
    s === 'na' ||
    s === 'n/a' ||
    s === 'nagb' ||
    s === 'null' ||
    s === 'undefined' ||
    s === 'unknown' ||
    s === '0' ||
    s === '0%' ||
    s === 'direct'
  );
};

module.exports = async function handler(req, res) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '';

  const now = Date.now();
  cleanupOldIps();

  // Rate-limiting check: ignore rapid page reloads from same IP
  if (ip && recentVisitors.has(ip)) {
    const lastSeen = recentVisitors.get(ip);
    if (now - lastSeen < COOLDOWN_MS) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ ok: true, skipped: 'cooldown_active' });
    }
  }
  if (ip) {
    recentVisitors.set(ip, now);
  }

  const ua = req.headers['user-agent'] || '';
  const ref = req.query.ref || req.headers['referer'] || '';
  const cores = req.query.cores || '';
  const ram = req.query.ram || '';
  const net = req.query.net || '';
  const battery = req.query.battery || '';

  const { os, device, browser } = parseUserAgent(ua);

  // IP Geolocation lookup
  let geo = '';
  let isp = '';
  let lat = null;
  let lon = null;
  if (ip && ip !== '127.0.0.1' && ip !== '::1') {
    try {
      const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,city,regionName,isp,lat,lon`);
      const j = await r.json();
      if (j && j.status === 'success') {
        const parts = [j.city, j.regionName, j.country].filter(Boolean);
        geo = parts.join(', ');
        isp = j.isp || '';
        lat = j.lat;
        lon = j.lon;
      }
    } catch {}
  }

  // Build clean message strictly omitting any NA/empty/missing values
  const lines = ['🦇 <b>New Visitor on Your Site</b>\n'];

  if (!isInvalid(ip)) {
    lines.push(`🌐 <b>IP:</b> <code>${ip}</code>`);
  }
  if (!isInvalid(geo)) {
    lines.push(`📍 <b>Location:</b> ${geo}`);
  }
  if (!isInvalid(isp)) {
    lines.push(`🏢 <b>ISP:</b> ${isp}`);
  }

  let deviceStr = os;
  if (device) deviceStr += ` • ${device}`;
  if (!isInvalid(deviceStr)) {
    lines.push(`📱 <b>Device:</b> ${deviceStr}`);
  }
  if (!isInvalid(browser)) {
    lines.push(`🌐 <b>Browser:</b> ${browser}`);
  }

  const parsedCores = parseInt(cores, 10);
  if (!isNaN(parsedCores) && parsedCores > 0) {
    lines.push(`⚡ <b>CPU:</b> ${parsedCores} Cores`);
  }

  const parsedRam = parseFloat(ram);
  if (!isNaN(parsedRam) && parsedRam > 0) {
    lines.push(`🧠 <b>RAM:</b> ${parsedRam} GB`);
  }

  if (!isInvalid(net)) {
    lines.push(`📶 <b>Network:</b> ${String(net).toUpperCase()}`);
  }

  if (!isInvalid(battery) && String(battery).includes('%')) {
    lines.push(`🔋 <b>Battery:</b> ${battery}`);
  }

  if (!isInvalid(ref)) {
    let cleanRef = ref;
    if (/instagram\.com/i.test(ref)) cleanRef = 'Instagram';
    else if (/google\./i.test(ref)) cleanRef = 'Google Search';
    else if (/t\.co|twitter\.com|x\.com/i.test(ref)) cleanRef = 'Twitter / X';
    else if (/linkedin\.com/i.test(ref)) cleanRef = 'LinkedIn';
    lines.push(`🔗 <b>Source:</b> ${cleanRef}`);
  }

  const text = lines.join('\n');

  const payload = {
    chat_id: CHAT,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    link_preview_options: { is_disabled: true },
  };

  // Only add button if approx map coordinates exist
  if (lat && lon) {
    payload.reply_markup = {
      inline_keyboard: [
        [{ text: '📍 View Approx Location (Map)', url: `https://www.google.com/maps?q=${lat},${lon}` }]
      ]
    };
  }

  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true });
};
