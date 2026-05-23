import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import axios from 'axios';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly bcbApiUrl: string;
  private readonly bcbApiKey: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {
    this.bcbApiUrl = config.get('BCB_QR_API_URL', 'https://api.bcb.gob.bo/qr');
    this.bcbApiKey = config.get('BCB_QR_API_KEY', '');
    this.webhookSecret = config.get('BCB_QR_WEBHOOK_SECRET', '');
  }

  async generateQR(orderId: string, businessId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { business: true },
    });

    if (!order || order.businessId !== businessId) {
      throw new Error('Pedido no encontrado');
    }

    // Referencia única de pago
    const paymentRef = randomUUID();

    // Llamada al API del BCB (QR Interoperable)
    let qrImageUrl: string;
    try {
      const response = await axios.post(
        `${this.bcbApiUrl}/generate`,
        {
          amount: Number(order.totalBs),
          currency: 'BOB',
          reference: paymentRef,
          description: `Pedido #${orderId.slice(-6).toUpperCase()} — ${order.business.name}`,
          entity_id: this.config.get('BCB_QR_ENTITY_ID'),
        },
        {
          headers: { Authorization: `Bearer ${this.bcbApiKey}` },
          timeout: 10_000,
        },
      );
      qrImageUrl = response.data.qr_image_url;
    } catch (err: any) {
      this.logger.error(`Error generando QR BCB: ${err.message}`);
      // En sandbox/desarrollo, usar QR placeholder
      qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${paymentRef}`;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { qrUrl: qrImageUrl, paymentRef },
    });

    return {
      order_id: orderId,
      amount_bs: Number(order.totalBs),
      qr_image_url: qrImageUrl,
      payment_ref: paymentRef,
    };
  }

  async handlePaymentWebhook(body: any, signature: string): Promise<void> {
    // Verificar firma HMAC del webhook BCB
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== expected) {
      this.logger.warn('Firma de webhook BCB inválida');
      return;
    }

    const { reference, status } = body;
    if (status !== 'PAID') return;

    const order = await this.prisma.order.findFirst({
      where: { paymentRef: reference },
      include: { customer: true, business: true },
    });

    if (!order) {
      this.logger.warn(
        `No se encontró pedido con referencia de pago: ${reference}`,
      );
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', paidAt: new Date() },
    });

    await this.notificationService.sendWhatsAppMessage(
      order.customer.phone,
      `✅ ¡Pago recibido! Tu pedido *#${order.id.slice(-6).toUpperCase()}* está confirmado.\n` +
        `Total pagado: Bs. ${order.totalBs}\n` +
        `Te avisamos cuando esté listo 👨‍🍳`,
    );

    this.logger.log(`Pedido ${order.id} pagado y confirmado`);
  }
}
