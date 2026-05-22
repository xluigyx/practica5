// backend/src/whatsappBot.js — Chatbot SEMAPA vía Evolution API (flujo tipo tótem)
const { buscarInmueble } = require('./inmuebleLookup');
const { sendWhatsAppText, sendWhatsAppImage } = require('./whatsapp');
const {
  getDesgloseContrato,
  createQrIntent,
  simulateTransaction,
  advanceVerification,
} = require('./paymentService');

const SESSION_TTL_MS = 45 * 60 * 1000;
const sessions = new Map();

function getSession(phone) {
  const s = sessions.get(phone);
  if (!s) return { step: 'welcome', updatedAt: Date.now() };
  if (Date.now() - s.updatedAt > SESSION_TTL_MS) {
    sessions.delete(phone);
    return { step: 'welcome', updatedAt: Date.now() };
  }
  return s;
}

function setSession(phone, patch) {
  const prev = getSession(phone);
  sessions.set(phone, { ...prev, ...patch, updatedAt: Date.now() });
}

function normalizeCmd(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function looksLikeLookup(text) {
  const t = text.trim();
  if (/^cbb-/i.test(t)) return true;
  if (/^\d{6,12}$/.test(t)) return true;
  if (/^[a-z]{2,}[\d-]+/i.test(t)) return true;
  return false;
}

function getAllMonths(breakdown) {
  return [...(breakdown.desgloseVencido || []), breakdown.facturaActual].filter(Boolean);
}

function defaultSelectedPeriods(breakdown) {
  const all = getAllMonths(breakdown);
  if (breakdown.desgloseVencido?.length > 0) {
    return [breakdown.desgloseVencido[0].periodo];
  }
  if (breakdown.facturaActual) return [breakdown.facturaActual.periodo];
  return [];
}

function sumSelected(breakdown, periods) {
  const all = getAllMonths(breakdown);
  return periods.reduce((sum, p) => {
    const item = all.find((x) => x.periodo === p);
    return sum + (item ? item.monto : 0);
  }, 0);
}

function parseMonthSelection(text, breakdown, currentSelected) {
  const all = getAllMonths(breakdown);
  const raw = text.replace(/\s/g, '');
  const parts = raw.split(/[,;]+/).filter(Boolean);

  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    const idx = parseInt(parts[0], 10) - 1;
    if (idx < 0 || idx >= all.length) return null;
    const target = all[idx].periodo;
    if (currentSelected.includes(target)) {
      const newSel = currentSelected.filter((p) => {
        const i = all.findIndex((x) => x.periodo === p);
        return i < idx;
      });
      return newSel.length > 0 ? newSel : [all[0].periodo];
    }
    return all.slice(0, idx + 1).map((m) => m.periodo);
  }

  const indices = parts.map((n) => parseInt(n, 10) - 1).filter((i) => i >= 0 && i < all.length);
  if (!indices.length) return null;
  const maxIdx = Math.max(...indices);
  return all.slice(0, maxIdx + 1).map((m) => m.periodo);
}

// Palabra clave de activación — el bot solo responde si el usuario envía esto primero
const ACTIVATION_KEYWORD = 'lulitolaredo';

function buildWelcomeText() {
  return `*💧 SEMAPA Cochabamba*
Asistente automático (Evolution API)

Envíame directamente tu:
• *Contrato* (ej. CBB-00448821)
• *CI / NIT* (ej. 7123456)
• *Serie del medidor* (ej. WP20-448821)

No necesitas escribir "hola".
*MENU* reinicia · *CANCELAR* borra la sesión`;
}

function isBotPhone(phone) {
  const bot = String(process.env.WHATSAPP_BOT_PHONE || process.env.WHATSAPP_BUSINESS_PHONE || '59162658425').replace(/\D/g, '');
  return phone === bot;
}

function buildAccountMessage(inmueble, factura, breakdown) {
  const estado =
    inmueble.estadoServicio === 'al-dia'
      ? '✅ Al día'
      : inmueble.estadoServicio === 'moroso'
        ? '⚠️ Moroso'
        : '🔴 Suspendido';

  const all = getAllMonths(breakdown);
  let mesesTxt = '';
  all.forEach((m, i) => {
    const tag = m.estado === 'vencido' ? '🔴 Vencido' : '🔵 Mes actual';
    mesesTxt += `\n*${i + 1}.* ${m.nombre} — Bs ${m.monto.toFixed(2)} (${tag})`;
  });

  const sel = defaultSelectedPeriods(breakdown);
  const montoSel = sumSelected(breakdown, sel);

  return `*📋 Cuenta encontrada*

👤 ${inmueble.nombre}
📍 ${inmueble.direccion}
🪪 Contrato: *${inmueble.contrato}*
📡 Medidor: ${inmueble.medidorSerie}
📊 ${estado}
💧 Consumo: *${inmueble.consumoActualM3} m³*

*Plan de cobro (orden cronológico):*${mesesTxt}

_Selección inicial: mes(es) ${sel.length} — Bs ${montoSel.toFixed(2)}_

*¿Qué deseas hacer?*
• Escribe el *número* del mes (ej. *1* o *1,2,3*) para elegir meses a pagar
• *PAGAR* — Generar QR Simple (Banco BNB)
• *MENU* — Volver al inicio`;
}

function buildSelectionSummary(breakdown, selected) {
  const all = getAllMonths(breakdown);
  const lines = selected
    .map((p) => all.find((x) => x.periodo === p))
    .filter(Boolean)
    .map((m) => `• ${m.nombre}: Bs ${m.monto.toFixed(2)}`)
    .join('\n');
  const total = sumSelected(breakdown, selected);
  return `*Meses seleccionados:*
${lines}

*Total: Bs ${total.toFixed(2)}*

Escribe *PAGAR* para generar el código QR.
Escribe otro número para cambiar la selección.`;
}

async function sendQrPayment(phone, session) {
  const total = sumSelected(session.breakdown, session.selectedPeriods);
  const { intent } = createQrIntent(session.contrato, session.selectedPeriods, total);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=040913&data=${encodeURIComponent(intent.paymentUri)}`;

  const text = `*💳 QR Simple — Banco BNB*

*Monto:* Bs ${total.toFixed(2)}
*Cuenta:* 3503205520
*Beneficiario:* SEMAPA Recaudaciones
*Contrato:* ${session.contrato}
*Meses:* ${session.selectedPeriods.join(', ')}

Escanea el QR adjunto desde la app del BNB.

Cuando hayas pagado (o en pruebas), escribe:
*VALIDO* o *PAGADO*

_Ref. interna: ${intent.id}_`;

  await sendWhatsAppText(phone, text);
  try {
    await sendWhatsAppImage(phone, qrImageUrl, 'QR Simple SEMAPA — Banco BNB');
  } catch (e) {
    await sendWhatsAppText(phone, `🔗 QR (enlace): ${qrImageUrl}`);
  }

  setSession(phone, {
    step: 'awaiting_payment',
    intentId: intent.id,
    txHash: null,
  });
}

async function confirmPayment(phone, session) {
  if (!session.intentId) {
    await sendWhatsAppText(phone, 'No hay un pago pendiente. Escribe *PAGAR* después de elegir meses.');
    return;
  }

  await sendWhatsAppText(phone, '⏳ Validando compensación ACH interbancaria (3 ciclos)...');

  const sim = simulateTransaction(session.intentId);
  if (!sim) {
    await sendWhatsAppText(phone, '❌ No se encontró la intención de pago. Genera el QR de nuevo con *PAGAR*.');
    return;
  }

  let last = null;
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    last = await advanceVerification(sim.txHash);
  }

  if (last?.status === 'completado') {
    setSession(phone, { step: 'welcome', intentId: null, txHash: null });
    await sendWhatsAppText(
      phone,
      `*✅ ¡Pago registrado con éxito!*

Ref. ACH: *${sim.txHash}*
Monto: *Bs ${last.montoBs.toFixed(2)}*
Contrato: *${last.contrato}*

El cobro quedó guardado en Cassandra.
Escribe *MENU* para otra consulta o envía un nuevo contrato/CI/medidor.`
    );
    return;
  }

  await sendWhatsAppText(phone, '⚠️ El pago aún no se confirmó. Intenta de nuevo con *VALIDO*.');
}

async function loadAccount(phone, query) {
  const data = await buscarInmueble(query);
  if (!data) {
    await sendWhatsAppText(
      phone,
      `❌ No encontramos *"${query}"* en Cassandra.

Revisa contrato (CBB-…), CI o serie del medidor.

${buildWelcomeText()}`
    );
    setSession(phone, { step: 'welcome' });
    return;
  }

  const breakdown = await getDesgloseContrato(data.inmueble.contrato);
  const selected = defaultSelectedPeriods(breakdown);

  setSession(phone, {
    step: 'account',
    contrato: data.inmueble.contrato,
    inmueble: data.inmueble,
    factura: data.factura,
    breakdown,
    selectedPeriods: selected,
    intentId: null,
    txHash: null,
  });

  await sendWhatsAppText(phone, buildAccountMessage(data.inmueble, data.factura, breakdown));
}

async function handleIncomingText(fromPhone, textBody) {
  const text = String(textBody || '').trim();
  if (!text) return;

  const cmd = normalizeCmd(text);
  const session = getSession(fromPhone);

  // ──────────────────────────────────────────────────────────────────────
  // GATE: El bot SOLO se activa cuando el usuario envía "LULITOLAREDO"
  // Si la sesión no está activada, ignorar cualquier otro mensaje.
  // ──────────────────────────────────────────────────────────────────────
  if (!session.activated) {
    if (cmd === ACTIVATION_KEYWORD) {
      console.log(`[WhatsApp Bot] ✅ Activación con keyword "${ACTIVATION_KEYWORD}" desde ${fromPhone}`);
      setSession(fromPhone, { step: 'welcome', activated: true });
      await sendWhatsAppText(fromPhone, buildWelcomeText());
      return;
    }
    // No está activado y no envió la keyword → ignorar silenciosamente
    console.log(`[WhatsApp Bot] ⏭️ Mensaje ignorado de ${fromPhone} (no activado). Texto: "${text.slice(0, 40)}"`);
    return;
  }

  // ── Ya está activado — flujo normal del chatbot ──

  if (['cancelar', 'reiniciar', 'salir'].includes(cmd)) {
    sessions.delete(fromPhone); // desactivar completamente
    await sendWhatsAppText(fromPhone, '👋 Sesión cerrada. Escribe *LULITOLAREDO* para volver a activar el asistente.');
    return;
  }

  if (['menu', 'ayuda', 'help', 'inicio'].includes(cmd)) {
    setSession(fromPhone, { step: 'welcome' });
    await sendWhatsAppText(fromPhone, buildWelcomeText());
    return;
  }

  if (session.step === 'awaiting_payment') {
    if (['valido', 'validado', 'pagado', 'pague', 'confirmar', 'ok', 'listo', 'si', '1', 'hecho', 'transferi', 'transferido'].includes(cmd)) {
      await confirmPayment(fromPhone, session);
      return;
    }
    if (['pagar', 'qr'].includes(cmd)) {
      await sendQrPayment(fromPhone, session);
      return;
    }
    await sendWhatsAppText(
      fromPhone,
      'Tienes un QR pendiente. Escribe *VALIDO* o *PAGADO* cuando hayas transferido.\n*CANCELAR* para reiniciar.'
    );
    return;
  }

  if (session.step === 'account') {
    if (['pagar', 'pago', 'qr', 'si', 'pagar qr'].includes(cmd)) {
      if (!session.selectedPeriods?.length) {
        await sendWhatsAppText(fromPhone, 'Primero elige al menos un mes con un número (ej. *1*).');
        return;
      }
      await sendQrPayment(fromPhone, session);
      return;
    }

    const parsed = parseMonthSelection(text, session.breakdown, session.selectedPeriods || []);
    if (parsed) {
      setSession(fromPhone, { selectedPeriods: parsed });
      await sendWhatsAppText(fromPhone, buildSelectionSummary(session.breakdown, parsed));
      return;
    }

    if (looksLikeLookup(text)) {
      await loadAccount(fromPhone, text);
      return;
    }

    await sendWhatsAppText(
      fromPhone,
      `No entendí. En tu cuenta puedes:\n• Escribir *1*, *2*… para meses\n• *PAGAR* para QR\n• *MENU* para inicio`
    );
    return;
  }

  if (looksLikeLookup(text)) {
    await loadAccount(fromPhone, text);
    return;
  }

  if (session.step === 'welcome') {
    await sendWhatsAppText(
      fromPhone,
      `Para consultar tu cuenta, envía tu *contrato*, *CI* o *serie del medidor*.\n\nEjemplo: *CBB-00448821*`
    );
    return;
  }

  await sendWhatsAppText(fromPhone, buildWelcomeText());
}

function extractMessageText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.ephemeralMessage?.message?.conversation ||
    message.ephemeralMessage?.message?.extendedTextMessage?.text ||
    ''
  ).trim();
}

function phoneFromRemoteJid(remoteJid) {
  if (!remoteJid) return null;
  return String(remoteJid).split('@')[0].replace(/\D/g, '') || null;
}

function collectEvolutionMessages(body) {
  const out = [];
  if (!body) return out;

  const event = String(body.event || body.type || '').toLowerCase();
  const isMessageEvent =
    !event ||
    event.includes('message') ||
    event.includes('upsert') ||
    event === 'send.message';
  if (!isMessageEvent) return out;

  const chunks = [];
  if (Array.isArray(body.data)) chunks.push(...body.data);
  else if (body.data) chunks.push(body.data);
  if (body.message) chunks.push(body);

  for (const item of chunks) {
    const key = item.key || item;
    if (!key || key.fromMe === true) continue;
    const remoteJid = key.remoteJid || key.remoteJidAlt || item.remoteJid;
    if (String(remoteJid || '').includes('@g.us')) continue;

    const phone = phoneFromRemoteJid(remoteJid);
    if (!phone) continue;
    // Ya no filtramos por isBotPhone — la activación se controla con la keyword LULITOLAREDO

    const msgText = extractMessageText(item.message || item);
    if (msgText) out.push({ phone, msgText });
  }
  return out;
}

async function processEvolutionWebhook(body) {
  const messages = collectEvolutionMessages(body);
  if (!messages.length) {
    if (body?.event) console.log('[Evolution Webhook] Evento sin texto entrante:', body.event);
    return { handled: 0 };
  }

  let handled = 0;
  for (const { phone, msgText } of messages) {
    try {
      console.log(`[Evolution Webhook] Mensaje de ${phone}: ${msgText.slice(0, 80)}`);
      await handleIncomingText(phone, msgText);
      handled++;
    } catch (err) {
      console.error('[WhatsApp Bot]', phone, err.message);
      await sendWhatsAppText(phone, '⚠️ Error temporal. Intenta de nuevo con tu contrato o CI.').catch(() => {});
    }
  }
  return { handled };
}

async function processWebhookPayload(body) {
  if (!body || body.object !== 'whatsapp_business_account') return { handled: 0 };
  let handled = 0;
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      for (const msg of change.value?.messages || []) {
        if (msg.type !== 'text' || !msg.text?.body) continue;
        try {
          await handleIncomingText(msg.from, msg.text.body);
          handled++;
        } catch (err) {
          console.error('[WhatsApp Bot Meta]', err.message);
        }
      }
    }
  }
  return { handled };
}

function buildAvisoCobranza(inmueble, periodo, totalBs) {
  const periodoLabel = periodo === '2025-05' ? 'Mayo 2025' : periodo;
  return (
    `*💧 SEMAPA INFORMA*\n\n` +
    `Estimado(a) *${inmueble.nombre}*, factura *${periodoLabel}* — *${inmueble.contrato}*.\n` +
    `Total: *Bs ${totalBs.toFixed(2)}*\n\n` +
    `Responda *HOLA* para consultar y pagar por este chat.`
  );
}

module.exports = {
  handleIncomingText,
  processWebhookPayload,
  processEvolutionWebhook,
  buildAvisoCobranza,
  buildWelcomeText,
};
