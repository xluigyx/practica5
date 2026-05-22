import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [salesToday, activeConversations, ordersByStatus, conversionRate] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: { businessId, status: 'DELIVERED', paidAt: { gte: today } },
          _sum: { totalBs: true },
          _count: true,
        }),
        this.prisma.conversation.count({
          where: {
            businessId,
            lastActivity: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: { businessId },
          _count: true,
        }),
        this._getConversionRate(businessId, today),
      ]);

    return {
      salesTodayBs: Number(salesToday._sum.totalBs || 0),
      ordersToday: salesToday._count,
      activeConversations,
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((o) => [o.status, o._count]),
      ),
      conversionRate,
    };
  }

  private async _getConversionRate(
    businessId: string,
    since: Date,
  ): Promise<number> {
    const [totalConversations, closedWithOrder] = await Promise.all([
      this.prisma.conversation.count({
        where: { businessId, sessionStart: { gte: since } },
      }),
      this.prisma.order.count({
        where: { businessId, createdAt: { gte: since } },
      }),
    ]);
    if (totalConversations === 0) return 0;
    return Math.round((closedWithOrder / totalConversations) * 10000) / 100;
  }

  async getSalesReport(businessId: string, from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        businessId,
        status: 'DELIVERED',
        paidAt: { gte: from, lte: to },
      },
      include: { customer: true },
      orderBy: { paidAt: 'desc' },
    });
    return orders;
  }

  /** Persiste métricas diarias a las 20:00 hora boliviana (UTC-4 = 00:00 UTC) */
  @Cron('0 0 * * *')
  async sendDailySummaries() {
    const businesses = await this.prisma.business.findMany({
      select: { id: true, name: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const business of businesses) {
      const metrics = await this.getDashboardMetrics(business.id);

      await this.prisma.dailyAnalytic.upsert({
        where: { businessId_date: { businessId: business.id, date: today } },
        update: {
          totalSalesBs: metrics.salesTodayBs,
          totalOrders: metrics.ordersToday,
          completedOrders: metrics.ordersByStatus['DELIVERED'] || 0,
          cancelledOrders: metrics.ordersByStatus['CANCELLED'] || 0,
          totalConversations: metrics.activeConversations,
          conversionRate: metrics.conversionRate / 100,
        },
        create: {
          businessId: business.id,
          date: today,
          totalSalesBs: metrics.salesTodayBs,
          totalOrders: metrics.ordersToday,
          completedOrders: metrics.ordersByStatus['DELIVERED'] || 0,
          cancelledOrders: metrics.ordersByStatus['CANCELLED'] || 0,
          totalConversations: metrics.activeConversations,
          conversionRate: metrics.conversionRate / 100,
        },
      });
    }
  }
}
