import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationService } from '../notification/notification.service';

/** Controlador interno — solo accesible por el agente IA con token interno */
@ApiExcludeController()
@ApiTags('internal')
@Controller('internal')
export class InternalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  private verifyToken(token: string) {
    if (token !== this.config.getOrThrow('BACKEND_INTERNAL_TOKEN')) {
      throw new UnauthorizedException('Token interno inválido');
    }
  }

  // ── Catálogo ─────────────────────────────────────────────────────────────

  @Get('catalog/search')
  async searchCatalog(
    @Headers('x-internal-token') token: string,
    @Query('query') query: string,
    @Query('business_id') businessId: string,
    @Query('limit') limit = '5',
  ) {
    this.verifyToken(token);
    const maxLimit = Math.min(parseInt(limit, 10), 10);

    // Verificar si hay productos con embeddings para este negocio
    const embeddingCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM products
      WHERE business_id = ${businessId} AND embedding IS NOT NULL
    `;
    const hasEmbeddings = Number(embeddingCount[0]?.count ?? 0) > 0;

    if (hasEmbeddings) {
      // Búsqueda semántica con pgvector (cosine similarity)
      const products = await this.prisma.$queryRaw<any[]>`
        SELECT id, name, description, price_bs, stock, category, image_url, available
        FROM products
        WHERE business_id = ${businessId}
          AND available = true
          AND stock > 0
          AND embedding IS NOT NULL
        ORDER BY embedding <=> (
          SELECT embedding FROM products
          WHERE business_id = ${businessId}
            AND name ILIKE ${'%' + query + '%'}
            AND embedding IS NOT NULL
          LIMIT 1
        )
        LIMIT ${maxLimit}
      `;
      if (products.length) return { products };
    }

    // Búsqueda textual (primaria cuando no hay embeddings, fallback si los hay)
    const textResults = await this.prisma.product.findMany({
      where: {
        businessId,
        available: true,
        stock: { gt: 0 },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: maxLimit,
      select: {
        id: true,
        name: true,
        description: true,
        priceBs: true,
        stock: true,
        category: true,
        imageUrl: true,
        available: true,
      },
    });

    // Si la búsqueda exacta no encuentra nada, devolver todos los productos del negocio
    if (!textResults.length) {
      const allProducts = await this.prisma.product.findMany({
        where: { businessId, available: true, stock: { gt: 0 } },
        take: maxLimit,
        select: {
          id: true,
          name: true,
          description: true,
          priceBs: true,
          stock: true,
          category: true,
          imageUrl: true,
          available: true,
        },
      });
      return {
        products: allProducts.map((p) => ({
          ...p,
          price_bs: p.priceBs,
          image_url: p.imageUrl,
        })),
      };
    }

    return {
      products: textResults.map((p) => ({
        ...p,
        price_bs: p.priceBs,
        image_url: p.imageUrl,
      })),
    };
  }

  @Get('catalog/products/:id')
  async getProduct(
    @Headers('x-internal-token') token: string,
    @Param('id') id: string,
    @Query('business_id') businessId: string,
  ) {
    this.verifyToken(token);
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p || p.businessId !== businessId)
      throw new NotFoundException('Producto no encontrado');
    return {
      id: p.id,
      name: p.name,
      price_bs: Number(p.priceBs),
      stock: p.stock,
      description: p.description,
      available: p.available,
    };
  }

  // ── Pedidos ───────────────────────────────────────────────────────────────

  @Post('orders')
  async createOrder(
    @Headers('x-internal-token') token: string,
    @Body()
    body: {
      business_id: string;
      customer_phone: string;
      items: any[];
      delivery_address: string;
    },
  ) {
    this.verifyToken(token);
    const order = await this.orderService.create(body.business_id, {
      customerPhone: body.customer_phone,
      items: body.items.map((i) => ({
        productId: i.product_id,
        quantity: i.quantity,
        unitPriceBs: i.unit_price_bs,
      })),
      deliveryAddress: body.delivery_address,
    });
    return {
      order_id: order.id,
      total_bs: Number(order.totalBs),
      status: order.status,
    };
  }

  @Get('orders')
  async getOrders(
    @Headers('x-internal-token') token: string,
    @Query('deliverer_id') delivererId: string,
    @Query('status') statusStr: string,
  ) {
    this.verifyToken(token);
    const statuses = statusStr ? statusStr.split(',') : [];
    const orders = await this.prisma.order.findMany({
      where: {
        delivererId,
        ...(statuses.length ? { status: { in: statuses as any[] } } : {}),
      },
      include: { customer: true },
    });
    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PREPARING: 'Preparando',
      IN_TRANSIT: 'En camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    };
    return {
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        status_label: STATUS_LABELS[o.status] || o.status,
        delivery_address: o.deliveryAddress,
        total_bs: Number(o.totalBs),
        items_summary: (o.itemsJson as any[])
          .map((i: any) => `${i.quantity}x ${i.productId}`)
          .join(', '),
        customer_name: o.customer.name,
      })),
    };
  }

  @Get('orders/:id')
  async getOrder(
    @Headers('x-internal-token') token: string,
    @Param('id') id: string,
    @Query('customer_phone') customerPhone?: string,
    @Query('deliverer_id') delivererId?: string,
  ) {
    this.verifyToken(token);
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (customerPhone && order.customer.phone !== customerPhone)
      throw new ForbiddenException();
    if (delivererId && order.delivererId && order.delivererId !== delivererId)
      throw new ForbiddenException();
    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PREPARING: 'Preparando',
      IN_TRANSIT: 'En camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    };
    return {
      id: order.id,
      status: order.status,
      status_label: STATUS_LABELS[order.status] || order.status,
      total_bs: Number(order.totalBs),
      delivery_address: order.deliveryAddress,
      customer_name: order.customer.name,
      items_summary: (order.itemsJson as any[])
        .map((i: any) => `${i.quantity}x ${i.productId}`)
        .join(', '),
      deliverer_lat: (order as any).delivererLat ?? null,
      deliverer_lng: (order as any).delivererLng ?? null,
      deliverer_updated_at: (order as any).delivererUpdatedAt ?? null,
    };
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Headers('x-internal-token') token: string,
    @Param('id') id: string,
    @Body() body: { status: string; deliverer_id?: string },
  ) {
    this.verifyToken(token);
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (
      body.deliverer_id &&
      order.delivererId &&
      order.delivererId !== body.deliverer_id
    ) {
      throw new ForbiddenException('Este pedido no es tuyo');
    }
    return this.orderService.updateStatus(
      id,
      order.businessId,
      { status: body.status as any },
      body.deliverer_id,
    );
  }

  @Patch('orders/:id/location')
  async updateOrderLocation(
    @Headers('x-internal-token') token: string,
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number; deliverer_id?: string },
  ) {
    this.verifyToken(token);
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (
      body.deliverer_id &&
      order.delivererId &&
      order.delivererId !== body.deliverer_id
    ) {
      throw new ForbiddenException('Este pedido no es tuyo');
    }
    return this.orderService.updateLocation(
      id,
      order.businessId,
      body.lat,
      body.lng,
    );
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────

  @Post('payments/qr')
  async generateQr(
    @Headers('x-internal-token') token: string,
    @Body() body: { order_id: string; business_id: string },
  ) {
    this.verifyToken(token);
    return this.paymentService.generateQR(body.order_id, body.business_id);
  }

  // ── Repartidores ──────────────────────────────────────────────────────────

  @Get('deliverers/verify')
  async verifyDeliverer(
    @Headers('x-internal-token') token: string,
    @Query('phone') phone: string,
    @Query('business_id') businessId: string,
  ) {
    this.verifyToken(token);
    const deliverer = await this.prisma.deliverer.findUnique({
      where: { phone_businessId: { phone, businessId } },
    });
    if (!deliverer || !deliverer.active)
      throw new NotFoundException('Repartidor no registrado');
    return { id: deliverer.id, name: deliverer.name, phone: deliverer.phone };
  }

  // ── Conversaciones ────────────────────────────────────────────────────────

  @Get('mistakes')
  async getMistakes(
    @Headers('x-internal-token') token: string,
    @Query('business_id') businessId: string,
  ) {
    this.verifyToken(token);
    const feedbacks = await this.prisma.escalationFeedback.findMany({
      where: {
        wasAiMistake: true,
        conversation: { businessId },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        resolutionNote: true,
        createdAt: true,
        conversationId: true,
      },
    });
    return { mistakes: feedbacks };
  }

  @Post('conversations/escalate')
  async escalateConversation(
    @Headers('x-internal-token') token: string,
    @Body()
    body: {
      reason: string;
      customer_phone: string;
      business_id: string;
      conversation_summary: string;
    },
  ) {
    this.verifyToken(token);
    await this.prisma.conversation.updateMany({
      where: {
        customerPhone: body.customer_phone,
        businessId: body.business_id,
      },
      data: { escalated: true },
    });
    // Notificar al admin del negocio sobre la escalación
    const business = await this.prisma.business.findUnique({
      where: { id: body.business_id },
    });
    if (business) {
      await this.notificationService.sendWhatsAppMessage(
        business.whatsappNumber,
        `⚠️ *Conversación escalada*\n` +
          `Cliente: ${body.customer_phone}\n` +
          `Motivo: ${body.reason}\n\n` +
          `Resumen: ${body.conversation_summary}`,
      );
    }
    return { escalated: true };
  }
}
