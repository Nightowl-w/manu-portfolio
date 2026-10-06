// Vercel serverless function: forward contact form fills to Telegram
const TOKEN = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';
const CHAT = process.env.TG_CHAT_ID || '8908879084';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name = '', email = '', message = '', services = '', subject = '' } = req.body || {};
  const text =
    `📨 *New enquiry from your portfolio*\n\n` +
    `👤 Name: ${name}\n` +
    `📧 Email: ${email}\n` +
    `🏷 Services: ${services || 'not specified'}\n` +
    (subject ? `▫️ Subject: ${subject}\n\n` : '\n') +
    `💬 Message:\n${message}`;
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
