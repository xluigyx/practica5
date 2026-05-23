import {
  Controller,
  Post,
  Body,
  HttpCode,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { EvolutionWebhookGuard } from './evolution-webhook.guard';

/**
 * Recibe los eventos de Evolution API y los delega a WhatsAppService.
 *
 * Flujo sin n8n:
 *   WhatsApp → Evolution API → POST /evolution/webhook → WhatsAppService → AI Agent → Evolution API → WhatsApp
 *
 * Evolution API debe configurarse con:
 *   WEBHOOK_GLOBAL_URL=http://backend:3001/evolution/webhook
 *   WEBHOOK_EVENTS_MESSAGES_UPSERT=true
 */
@ApiTags('evolution')
@Controller('evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  /**
   * Endpoint de webhook para Evolution API.
   * Responde 200 inmediatamente y procesa en background.
   */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(EvolutionWebhookGuard)
  receiveEvolutionWebhook(@Body() body: any) {
    this.whatsappService
      .processEvolutionEvent(body)
      .catch((err) =>
        this.logger.error('Error procesando evento Evolution:', err.message),
      );
    return { status: 'ok' };
  }
}
