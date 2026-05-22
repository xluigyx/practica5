import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersGateway } from './orders.gateway';

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(businessId: string, dto: CreateOrderDto) {
    // Resolver o crear cliente
    let customer = await this.prisma.customer.findUnique({
      where: { phone_businessId: { phone: dto.customerPhone, businessId } },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          phone: dto.customerPhone,
          name: dto.customerName || dto.customerPhone,
          businessId,
        },
      });
    }

    const total = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceBs,
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        businessId,
        customerId: customer.id,
        itemsJson: dto.items as any,
        deliveryAddress: dto.deliveryAddress,
        totalBs: total,
        status: 'PENDING',
      },
    });

    this.ordersGateway.emitOrderUpdate(businessId, order);
    return order;
  }

  async findAll(
    businessId: string,
    opts: { page: number; limit: number; status?: OrderStatus },
  ) {
    const where = {
      businessId,
      ...(opts.status ? { status: opts.status } : {}),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { customer: true, deliverer: true },
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, total };
  }

  async findOne(id: string, businessId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true, deliverer: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.businessId !== businessId) throw new ForbiddenException();
    return order;
  }

  async updateStatus(
    id: string,
    businessId: string,
    dto: UpdateOrderStatusDto,
    delivererId?: string,
  ) {
    const order = await this.findOne(id, businessId);
    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${order.status} a ${dto.status}`,
      );
    }

    // Si viene de repartidor, verificar que le pertenece o aún no está asignado
    // Solo aplicar lógica de repartidor si el negocio tiene delivery activo
    if (delivererId) {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { hasDelivery: true },
      });
      if (business?.hasDelivery) {
        if (order.delivererId && order.delivererId !== delivererId) {
          throw new ForbiddenException('Este pedido no es tuyo');
        }
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        ...(delivererId ? { delivererId } : {}),
      },
    });

    this.ordersGateway.emitOrderUpdate(businessId, updated);
    return updated;
  }

  async updateLocation(
    id: string,
    businessId: string,
    lat: number,
    lng: number,
  ) {
    const order = await this.findOne(id, businessId);
    if (!order) throw new NotFoundException('Pedido no encontrado');
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        delivererLat: lat,
        delivererLng: lng,
        delivererUpdatedAt: new Date(),
      },
    });
    this.ordersGateway.emitOrderUpdate(businessId, updated);
    return updated;
  }
}
