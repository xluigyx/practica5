import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConversationsFilter {
  page: number;
  limit: number;
  escalated?: boolean;
  search?: string;
}

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(businessId: string, opts: ConversationsFilter) {
    const where: any = { businessId };
    if (opts.escalated !== undefined) {
      where.escalated = opts.escalated;
    }
    if (opts.search) {
      where.customerPhone = { contains: opts.search };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { lastActivity: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      total,
      page: opts.page,
      pages: Math.ceil(total / opts.limit),
    };
  }

  async findOne(id: string, businessId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!conversation)
      throw new NotFoundException('Conversación no encontrada');
    if (conversation.businessId !== businessId) throw new ForbiddenException();
    return conversation;
  }

  /** Marca una conversación como escalada (o la des-escala) */
  async setEscalated(id: string, businessId: string, escalated: boolean) {
    await this.findOne(id, businessId); // verifica propiedad
    return this.prisma.conversation.update({
      where: { id },
      data: { escalated },
    });
  }

  /** Elimina el historial de mensajes de una conversación (GDPR / privacidad) */
  async clearMessages(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.conversation.update({
      where: { id },
      data: { messagesJson: [] },
    });
  }

  /** Estadísticas de conversaciones para el dashboard */
  async getStats(businessId: string) {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const [total, active, escalated] = await Promise.all([
      this.prisma.conversation.count({ where: { businessId } }),
      this.prisma.conversation.count({
        where: { businessId, lastActivity: { gte: fifteenMinsAgo } },
      }),
      this.prisma.conversation.count({
        where: { businessId, escalated: true },
      }),
    ]);
    return { total, active, escalated };
  }

  /** Guarda feedback de resolución de una conversación escalada */
  async saveFeedback(
    conversationId: string,
    businessId: string,
    dto: { resolved: boolean; resolutionNote?: string; wasAiMistake: boolean },
  ) {
    await this.findOne(conversationId, businessId); // verifica propiedad
    return this.prisma.escalationFeedback.create({
      data: {
        conversationId,
        resolved: dto.resolved,
        resolutionNote: dto.resolutionNote,
        wasAiMistake: dto.wasAiMistake,
      },
    });
  }
}
