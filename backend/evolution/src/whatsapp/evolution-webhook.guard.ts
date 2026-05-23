import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';

/**
 * Valida que los webhooks entrantes de Evolution API lleven el API key correcto.
 *
 * Evolution API adjunta el global apikey en la cabecera `apikey` de cada request.
 * Se usa comparación segura con timingSafeEqual para evitar timing-attacks.
 */
@Injectable()
export class EvolutionWebhookGuard implements CanActivate {
  private readonly logger = new Logger(EvolutionWebhookGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const received = req.headers['apikey'] as string | undefined;

    // Si no viene apikey, aceptar solo si viene de la red interna Docker (172.x.x.x o 192.168.x.x)
    if (!received) {
      const rawIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        '';
      // Normalizar IPv4-mapped IPv6 (::ffff:172.x.x.x → 172.x.x.x)
      const ip = rawIp.replace(/^::ffff:/, '');
      const isInternal =
        ip.startsWith('172.') ||
        ip.startsWith('192.168.') ||
        ip === '::1' ||
        ip === '127.0.0.1';

      if (isInternal) {
        this.logger.verbose(`Webhook interno aceptado desde ${rawIp}`);
        return true;
      }

      this.logger.warn(
        `Evolution webhook sin cabecera apikey desde IP ${rawIp} — rechazado`,
      );
      throw new UnauthorizedException('apikey requerido');
    }

    const expected = this.config.getOrThrow<string>('EVOLUTION_API_KEY');

    // timingSafeEqual requiere buffers del mismo tamaño
    const recvBuf = Buffer.from(received);
    const expBuf = Buffer.from(expected);
    const valid =
      recvBuf.length === expBuf.length &&
      crypto.timingSafeEqual(recvBuf, expBuf);

    if (!valid) {
      this.logger.warn('Evolution webhook con apikey inválido');
      throw new UnauthorizedException('apikey inválido');
    }

    return true;
  }
}
