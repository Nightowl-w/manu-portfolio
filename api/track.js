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
  let os = 'Unknown OS';
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

  return { os, device, browser: app || browser || 'Browser' };
}

module.exports = async function handler(req, res) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  cleanupOldIps();

  // Rate-limiting check: ignore rapid page reloads from same IP
  if (ip !== 'unknown' && recentVisitors.has(ip)) {
    const lastSeen = recentVisitors.get(ip);
    if (now - lastSeen < COOLDOWN_MS) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ ok: true, skipped: 'cooldown_active' });
    }
  }
  if (ip !== 'unknown') {
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
  if (ip && ip !== 'unknown') {
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

  // Construct clean formatted message without empty/NA fields
  const lines = ['🦇 <b>New Visitor on Your Site</b>\n'];

  if (ip && ip !== 'unknown') {
    lines.push(`🌐 <b>IP:</b> <code>${ip}</code>`);
  }
  if (geo) {
    lines.push(`📍 <b>Location:</b> ${geo}`);
  }
  if (isp) {
    lines.push(`🏢 <b>ISP:</b> ${isp}`);
  }

  let deviceStr = os;
  if (device) deviceStr += ` • ${device}`;
  if (deviceStr && deviceStr !== 'Unknown OS') {
    lines.push(`📱 <b>Device:</b> ${deviceStr}`);
  }
  if (browser) {
    lines.push(`🌐 <b>Browser:</b> ${browser}`);
  }

  if (cores && cores !== 'NA' && cores !== '0') {
    lines.push(`⚡ <b>CPU:</b> ${cores} Cores`);
  }
  if (ram && ram !== 'NA' && ram !== '0') {
    lines.push(`🧠 <b>RAM:</b> ${ram} GB`);
  }
  if (net && net !== 'NA' && net !== '') {
    lines.push(`📶 <b>Network:</b> ${net.toUpperCase()}`);
  }
  if (battery && battery !== 'NA' && battery !== '') {
    lines.push(`🔋 <b>Battery:</b> ${battery}`);
  }

  if (ref && ref !== 'direct' && ref !== 'null' && ref !== '') {
    let cleanRef = ref;
    if (/instagram\.com/i.test(ref)) cleanRef = 'Instagram';
    else if (/google\./i.test(ref)) cleanRef = 'Google Search';
    else if (/t\.co|twitter\.com|x\.com/i.test(ref)) cleanRef = 'Twitter / X';
    else if (/linkedin\.com/i.test(ref)) cleanRef = 'LinkedIn';
    lines.push(`🔗 <b>Source:</b> ${cleanRef}`);
  }

  const text = lines.join('\n');

  // Inline keyboard buttons (e.g. Map Location, Referrer)
  const buttons = [];
  const row = [];
  if (lat && lon) {
    row.push({ text: '📍 View Location Map', url: `https://www.google.com/maps?q=${lat},${lon}` });
  }
  if (ref && ref.startsWith('http')) {
    row.push({ text: '🔗 Source Link', url: ref });
  }
  if (row.length > 0) {
    buttons.push(row);
  }

  const payload = {
    chat_id: CHAT,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    link_preview_options: { is_disabled: true },
  };

  if (buttons.length > 0) {
    payload.reply_markup = { inline_keyboard: buttons };
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
