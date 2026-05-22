import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { MessageSender } from './message.sender';
import { SessionManager } from './session.manager';
import { TemplatesService } from './templates.service';
import { MediaHandler } from './media.handler';
import { EvolutionService } from './evolution.service';
import { EvolutionWebhookController } from './evolution-webhook.controller';

@Module({
  controllers: [WhatsAppController, EvolutionWebhookController],
  providers: [
    WhatsAppService,
    MessageSender,
    SessionManager,
    TemplatesService,
    MediaHandler,
    EvolutionService,
  ],
  exports: [MessageSender, SessionManager, TemplatesService, EvolutionService],
})
export class WhatsAppModule {}
