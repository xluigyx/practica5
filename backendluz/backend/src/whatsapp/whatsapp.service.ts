import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';

type SendFn = (text: string, imageUrl?: string) => Promise<void>;

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly agentUrl: string;
  private readonly agentToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly evolution: EvolutionService,
  ) {
    this.agentUrl = config.get('AI_AGENT_URL', 'http://ai-agent:8000');
    this.agentToken = config.getOrThrow('BACKEND_INTERNAL_TOKEN');
  }

  /**
   * Procesa un evento de webhook de Evolution API.
   * Sistema 100% reactivo: solo responde cuando el cliente escribe primero.
   */
  async processEvolutionEvent(body: any): Promise<void> {
    const event: string = body?.event;
    if (event !== 'messages.upsert') return;

    const data = body?.data;
    if (!data) return;

    const key = data.key;
    if (key?.fromMe) return;

    const remoteJid: string = key?.remoteJid ?? '';
    const messageId: string = key?.id ?? '';
    const instanceName: string = body?.instance ?? '';

    // Ignorar mensajes de grupos
    if (remoteJid.includes('@g.us')) return;

    // Número del cliente (sin @s.whatsapp.net)
    const from = remoteJid.replace('@s.whatsapp.net', '');

    const msg = data.message ?? {};
    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      ''
    ).trim();

    if (!text) {
      await this.evolution.markRead(instanceName, remoteJid, messageId);
      return;
    }

    // Identificar negocio por el número de la instancia
    const senderJid: string = body?.sender ?? '';
    const senderPhone = senderJid.replace('@s.whatsapp.net', '');

    const business = await this.prisma.business.findFirst({
      where: { whatsappNumber: { contains: senderPhone } },
    });

    if (!business) {
      this.logger.warn(
        `No se encontró negocio para instancia Evolution: ${instanceName} (sender: ${senderPhone})`,
      );
      return;
    }

    await this.evolution.markRead(instanceName, remoteJid, messageId);

    const sendFn: SendFn = async (replyText, imageUrl) => {
      if (imageUrl) {
        await this.evolution.sendImage(instanceName, from, imageUrl, replyText || undefined);
      } else {
        await this.evolution.sendText(instanceName, from, replyText);
      }
    };

    await this.routeCustomer(from, business, text, sendFn);
  }

  private async routeCustomer(
    phone: string,
    business: any,
    message: string,
    sendFn: SendFn,
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        customerPhone_businessId: {
          customerPhone: phone,
          businessId: business.id,
        },
      },
    });

    const history: Array<{ role: string; content: string }> = conversation
      ? (conversation.messagesJson as any[])
      : [];

    const customer = await this.prisma.customer.findUnique({
      where: { phone_businessId: { phone, businessId: business.id } },
    });

    let reply: string;
    try {
      const response = await axios.post(
        `${this.agentUrl}/agent/customer`,
        {
          business_id: business.id,
          business_name: business.name,
          business_config: business.configJson,
          customer_phone: phone,
          customer_name: customer?.name || phone,
          purchase_history: JSON.stringify(customer?.purchaseHistoryJson || []),
          message,
          history: history.slice(-20),
        },
        { headers: { 'x-internal-token': this.agentToken }, timeout: 30_000 },
      );
      reply = response.data.reply;
    } catch (err: any) {
      this.logger.error(`Error agente cliente: ${err.message}`);
      reply = 'Lo siento, tuve un pequeño problema técnico. Por favor, intenta de nuevo en un momento 🙏';
    }

    const updatedHistory = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];

    if (conversation) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messagesJson: updatedHistory,
          lastActivity: new Date(),
          customerId: customer?.id,
        },
      });
    } else {
      await this.prisma.conversation.create({
        data: {
          customerPhone: phone,
          businessId: business.id,
          customerId: customer?.id,
          messagesJson: updatedHistory,
        },
      });
    }

    const qrMatch = reply.match(/\[QR_IMAGE_URL:(.+?)\]/);
    if (qrMatch) {
      const cleanReply = reply.replace(/\[QR_IMAGE_URL:.+?\]/, '').trim();
      await sendFn(cleanReply);
      await sendFn('Escanea para pagar 💳', qrMatch[1]);
    } else {
      await sendFn(reply);
    }
  }
}
