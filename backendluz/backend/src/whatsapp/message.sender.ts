import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Servicio de bajo nivel para enviar mensajes salientes a través de Evolution API.
 * Toda comunicación saliente hacia WhatsApp pasa por aquí.
 */
@Injectable()
export class MessageSender {
  private readonly logger = new Logger(MessageSender.name);
  private readonly http: AxiosInstance;
  private readonly instance: string;

  constructor(private readonly config: ConfigService) {
    const baseURL = config.get<string>('EVOLUTION_API_URL', 'http://evolution-api:8080');
    const apiKey = config.getOrThrow<string>('EVOLUTION_API_KEY');
    this.instance = config.getOrThrow<string>('EVOLUTION_INSTANCE_NAME');

    this.http = axios.create({
      baseURL,
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  private clean(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  /** Envía un mensaje de texto */
  async sendText(to: string, text: string): Promise<void> {
    const number = this.clean(to);
    try {
      await this.http.post(`/message/sendText/${this.instance}`, {
        number,
        text,
      });
    } catch (err: any) {
      const detail = err?.response?.data?.message ?? err.message;
      this.logger.error(`sendText a ${number}: ${detail}`);
      throw err;
    }
  }

  /** Envía una imagen por URL pública (p.ej. desde Cloudflare R2) */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
    const number = this.clean(to);
    try {
      await this.http.post(`/message/sendMedia/${this.instance}`, {
        number,
        mediatype: 'image',
        media: imageUrl,
        ...(caption ? { caption } : {}),
      });
    } catch (err: any) {
      const detail = err?.response?.data?.message ?? err.message;
      this.logger.error(`sendImage a ${number}: ${detail}`);
      throw err;
    }
  }

  /** Marca un mensaje como leído */
  async markRead(remoteJid: string, messageId: string): Promise<void> {
    try {
      await this.http.post(`/chat/markMessageAsRead/${this.instance}`, {
        readMessages: [{ remoteJid, id: messageId, fromMe: false }],
      });
    } catch {
      // No crítico — ignorar silenciosamente
    }
  }
}
