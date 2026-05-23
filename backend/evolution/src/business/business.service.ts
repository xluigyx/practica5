import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    return business;
  }

  async update(
    id: string,
    requestingBusinessId: string,
    data: Partial<{ name: string; configJson: any }>,
  ) {
    if (id !== requestingBusinessId) throw new ForbiddenException();
    return this.prisma.business.update({ where: { id }, data });
  }

  async getDeliverers(businessId: string) {
    return this.prisma.deliverer.findMany({ where: { businessId } });
  }

  async addDeliverer(businessId: string, phone: string, name: string) {
    return this.prisma.deliverer.create({ data: { businessId, phone, name } });
  }

  async removeDeliverer(businessId: string, delivererId: string) {
    const d = await this.prisma.deliverer.findUnique({
      where: { id: delivererId },
    });
    if (!d || d.businessId !== businessId) throw new ForbiddenException();
    return this.prisma.deliverer.update({
      where: { id: delivererId },
      data: { active: false },
    });
  }
}
