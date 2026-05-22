
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

function getProvider() {
  return (process.env.WHATSAPP_PROVIDER || 'evolution').toLowerCase();
}

function normalizePhoneE164(destino) {
  let digits = String(destino || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `591${digits}`;
  return digits;
}

function isConfigured() {
  const provider = getProvider();
  if (provider === 'evolution') {
    return Boolean(
      process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_API_KEY &&
      process.env.EVOLUTION_INSTANCE
    );
  }
  if (provider === 'callmebot') {
    return Boolean(process.env.CALLMEBOT_API_KEY);
  }
  if (provider === 'meta') {
    return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }
  return false;
}

function buildWaMeLink(destino, text) {
  const phone = normalizePhoneE164(destino || process.env.WHATSAPP_BUSINESS_PHONE);
  if (!phone) return null;
  const base = `https://wa.me/${phone}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

async function sendViaEvolution(toDigits, body) {
  const baseUrl = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/$/, '');
  const instance = process.env.EVOLUTION_INSTANCE || 'semapa';
  const apiKey = process.env.EVOLUTION_API_KEY;

  const url = `${baseUrl}/message/sendText/${instance}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: toDigits,
      text: body,
      linkPreview: false,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.message || data?.error || JSON.stringify(data) || res.statusText;
    throw new Error(`Evolution API ${res.status}: ${errMsg}`);
  }
  return { provider: 'evolution', messageId: data?.key?.id, raw: data };
}

async function sendViaMeta(toDigits, body) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toDigits,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText;
    throw new Error(`Meta WhatsApp API ${res.status}: ${errMsg}`);
  }
  return { provider: 'meta', messageId: data?.messages?.[0]?.id, raw: data };
}

async function sendViaCallMeBot(destino, body) {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const phone = destino.startsWith('+') ? destino : `+${normalizePhoneE164(destino)}`;
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', phone);
  url.searchParams.set('text', body);
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CallMeBot ${res.status}: ${text}`);
  }
  return { provider: 'callmebot', messageId: null, raw: text };
}

/**
 * Envía un mensaje de texto por WhatsApp.
 */
async function sendWhatsAppText(destino, body) {
  const text = String(body || '').trim();
  if (!text) throw new Error('Mensaje vacío');

  const toDigits = normalizePhoneE164(destino);
  if (!toDigits) throw new Error('Número de destino inválido');

  if (!isConfigured()) {
    console.warn('[WhatsApp] Sin credenciales — modo simulación:', { destino: toDigits, preview: text.slice(0, 120) });
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, simulated: true, provider: 'simulation' };
  }

  const provider = getProvider();
  let result;
  if (provider === 'evolution') {
    result = await sendViaEvolution(toDigits, text);
  } else if (provider === 'callmebot') {
    result = await sendViaCallMeBot(destino, text);
  } else {
    result = await sendViaMeta(toDigits, text);
  }

  console.log(`[WhatsApp] ${result.provider} → ${toDigits}`);
  return { ok: true, ...result };
}

async function sendViaEvolutionMedia(toDigits, mediaUrl, caption) {
  const baseUrl = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/$/, '');
  const instance = process.env.EVOLUTION_INSTANCE || 'semapa';
  const apiKey = process.env.EVOLUTION_API_KEY;
  const url = `${baseUrl}/message/sendMedia/${instance}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: toDigits,
      mediatype: 'image',
      mimetype: 'image/png',
      media: mediaUrl,
      caption: caption || '',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Evolution media ${res.status}: ${data?.message || res.statusText}`);
  }
  return { provider: 'evolution', messageId: data?.key?.id, raw: data };
}

async function sendWhatsAppImage(destino, imageUrl, caption) {
  const toDigits = normalizePhoneE164(destino);
  if (!toDigits) throw new Error('Número inválido');

  if (!isConfigured() || getProvider() !== 'evolution') {
    console.warn('[WhatsApp] Imagen no enviada (Evolution no configurado)');
    return { ok: false, simulated: true };
  }

  const result = await sendViaEvolutionMedia(toDigits, imageUrl, caption);
  return { ok: true, ...result };
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader) return true;

  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signatureHeader.replace(/^sha256=/, '');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

module.exports = {
  sendWhatsAppText,
  sendWhatsAppImage,
  normalizePhoneE164,
  isConfigured,
  getProvider,
  buildWaMeLink,
  verifyWebhookSignature,
};
