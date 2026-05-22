import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MessageSender } from './message.sender';

/**
 * Gestiona medios entrantes y salientes en WhatsApp.
 *
 * Flujos cubiertos:
 * 1. Cliente envía una imagen → obtener URL temporal de Meta para procesarla
 * 2. Negocio envía foto de producto al cliente → reenviar desde R2 a WhatsApp
 *
 * Meta firma las URLs de descarga de medios con tokens de corta duración;
 * siempre obtenerlas via API antes de descargar.
 */
@Injectable()
export class MediaHandler {
  private readonly logger = new Logger(MediaHandler.name);
  private readonly apiVersion: string;
  private readonly accessToken: string;

  constructor(
    private readonly sender: MessageSender,
    private readonly config: ConfigService,
  ) {
    this.apiVersion = config.get<string>('META_API_VERSION', 'v19.0');
    this.accessToken = config.getOrThrow<string>('META_ACCESS_TOKEN');
  }

  /**
   * Dado el media_id del webhook entrante, obtiene la URL de descarga temporal.
   * La URL es válida ~5 minutos; descargar de inmediato.
   */
  async getTemporaryUrl(mediaId: string): Promise<string> {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        timeout: 8_000,
      },
    );
    return response.data.url as string;
  }

  /**
   * Descarga un medio de Meta usando la URL temporal firmada.
   * Devuelve el buffer y el content-type.
   */
  async downloadMedia(
    temporaryUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await axios.get<ArrayBuffer>(temporaryUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      timeout: 15_000,
    });
    return {
      buffer: Buffer.from(response.data),
      contentType:
        (response.headers['content-type'] as string) ??
        'application/octet-stream',
    };
  }

  /**
   * Envía la foto de un producto al cliente.
   * imageUrl debe ser públicamente accesible (URL de Cloudflare R2 público).
   */
  async sendProductImage(
    to: string,
    imageUrl: string,
    productName: string,
    phoneNumberId?: string,
  ): Promise<void> {
    try {
      await this.sender.sendImage(to, imageUrl, productName);
    } catch (err: any) {
      this.logger.error(
        `No se pudo enviar imagen de producto "${productName}" a ${to}: ${err.message}`,
      );
    }
  }

  /**
   * Determina si un tipo MIME entrante es una imagen soportada.
   */
  isImage(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
  }
}
