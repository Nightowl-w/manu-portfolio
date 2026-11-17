// Vercel serverless function: Telegram visitor alert with sleek SOC / Batman theme
const TOKEN = process.env.TG_BOT_TOKEN;
const CHAT = process.env.TG_CHAT_ID;

// Cooldown to avoid duplicate alerts on reload (10 min per IP)
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
