import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Webhook de Evolution API.
   * Evolution envía: { event, instance, data: { key: { remoteJid, id }, message: { conversation | extendedTextMessage } } }
   * Autenticación: header apikey comparado con EVOLUTION_API_KEY (timing-safe).
   */
  @Post('webhook')
  @HttpCode(200)
  async receiveWebhook(
    @Body() body: any,
    @Headers('apikey') apiKey: string,
  ) {
    const expectedKey = this.config.getOrThrow<string>('EVOLUTION_API_KEY');
    const incoming = Buffer.from(apiKey ?? '');
    const expected = Buffer.from(expectedKey);
    if (
      incoming.length !== expected.length ||
      !crypto.timingSafeEqual(incoming, expected)
    ) {
      throw new UnauthorizedException('API key inválida');
    }

    // Procesar en background — Evolution espera 200 inmediato
    this.whatsappService
      .processEvolutionEvent(body)
      .catch((err) => this.logger.error('Error procesando webhook Evolution:', err));

    return { status: 'ok' };
  }
}
