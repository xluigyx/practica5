import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Valida la firma X-Hub-Signature-256 que Meta adjunta a cada webhook.
 * Requiere que NestFactory.create() tenga { rawBody: true }.
 */
@Injectable()
export class HmacGuard implements CanActivate {
  private readonly logger = new Logger(HmacGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!signature) {
      this.logger.warn('Webhook recibido sin cabecera X-Hub-Signature-256');
      throw new UnauthorizedException('Firma HMAC requerida');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error(
        'rawBody no disponible — asegúrate de usar NestFactory.create(AppModule, { rawBody: true })',
      );
      throw new UnauthorizedException('No se puede verificar la firma');
    }

    const appSecret = this.config.getOrThrow<string>('META_APP_SECRET');
    const expected =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    // timingSafeEqual evita timing-attacks en la comparación
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      this.logger.warn('Firma HMAC inválida — posible request falso');
      throw new UnauthorizedException('Firma HMAC inválida');
    }

    return true;
  }
}
