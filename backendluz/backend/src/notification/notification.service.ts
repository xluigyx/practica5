import { Injectable, Logger } from '@nestjs/common';

// Notificaciones deshabilitadas — sistema reactivo (Evolution API)
@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name);

	/**
	 * Compatibilidad temporal para servicios que aún invocan notificaciones salientes.
	 * En modo reactivo no se envían mensajes proactivos.
	 */
	async sendWhatsAppMessage(_to: string, _message: string): Promise<void> {
		this.logger.debug(
			'sendWhatsAppMessage ignorado: notificaciones proactivas deshabilitadas en modo reactivo',
		);
	}
}
