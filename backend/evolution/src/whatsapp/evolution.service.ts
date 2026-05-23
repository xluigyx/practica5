import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Cliente HTTP de bajo nivel para Evolution API v2.
 * Toda comunicación saliente hacia WhatsApp pasa por aquí.
 * Docs: https://doc.evolution-api.com
 */
@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly http: AxiosInstance;

  /** Instance name usada para el canal de clientes */
  readonly customerInstance: string;
  /** Instance name usada para el canal de repartidores (opcional) */
  readonly deliveryInstance: string;

  constructor(private readonly config: ConfigService) {
    const apiUrl = config.get<string>(
      'EVOLUTION_API_URL',
      'http://evolution-api:8080',
    );
    const apiKey = config.getOrThrow<string>('EVOLUTION_API_KEY');

    this.customerInstance = config.getOrThrow<string>(
      'EVOLUTION_INSTANCE_NAME',
    );
    this.deliveryInstance = config.get<string>(
      'EVOLUTION_INSTANCE_DELIVERY',
      this.customerInstance,
    );

    this.http = axios.create({
      baseURL: apiUrl,
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  /** Envía un mensaje de texto libre */
  async sendText(
    instanceName: string,
    to: string,
    text: string,
  ): Promise<void> {
    const number = this.cleanPhone(to);
    try {
      await this.http.post(`/message/sendText/${instanceName}`, {
        number,
        text,
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ?? err?.response?.data ?? err.message;
      this.logger.error(`sendText [${instanceName}] → ${number}: ${detail}`);
      throw err;
    }
  }

  /** Envía una imagen con caption opcional */
  async sendImage(
    instanceName: string,
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<void> {
    const number = this.cleanPhone(to);
    try {
      await this.http.post(`/message/sendMedia/${instanceName}`, {
        number,
        mediatype: 'image',
        media: imageUrl,
        ...(caption ? { caption } : {}),
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ?? err?.response?.data ?? err.message;
      this.logger.error(`sendImage [${instanceName}] → ${number}: ${detail}`);
      throw err;
    }
  }

  /**
   * Marca un mensaje como leído (tick azul).
   * No crítico — errores se loguean pero no se propagan.
   */
  async markRead(
    instanceName: string,
    remoteJid: string,
    messageId: string,
  ): Promise<void> {
    try {
      await this.http.post(`/chat/markMessageAsRead/${instanceName}`, {
        readMessages: [{ remoteJid, fromMe: false, id: messageId }],
      });
    } catch (err: any) {
      this.logger.warn(
        `markRead [${instanceName}] ${messageId}: ${err.message}`,
      );
    }
  }

  /** Consulta el estado de conexión de una instancia */
  async getConnectionState(
    instanceName: string,
  ): Promise<{ state: string; instance?: { state: string } }> {
    const response = await this.http.get(
      `/instance/connectionState/${instanceName}`,
    );
    return response.data;
  }

  private cleanPhone(phone: string): string {
    // Elimina sufijo @s.whatsapp.net y caracteres no numéricos
    return phone.replace(/@.*$/, '').replace(/[^\d]/g, '');
  }
}
