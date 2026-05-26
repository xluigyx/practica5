import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Determina si un número de teléfono entrante pertenece a un repartidor activo.
 *
 * Esto es más fiable que comparar phoneNumberIds porque:
 * - Un repartidor puede escribir desde el número de clientes por error
 * - El número de delivery puede cambiar sin actualizar la config
 * - La tabla deliverers es la fuente de verdad del negocio
 */
@Injectable()
export class RouterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve true si el teléfono está registrado como repartidor activo
   * del negocio indicado Y el negocio tiene has_delivery = true.
   */
  async isDeliverer(phone: string, businessId: string): Promise<boolean> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { hasDelivery: true },
    });
    if (!business?.hasDelivery) return false;

    const deliverer = await this.prisma.deliverer.findUnique({
      where: {
        phone_businessId: { phone, businessId },
      },
      select: { active: true },
    });
    return deliverer?.active ?? false;
  }

  /**
   * Devuelve el nombre del repartidor si existe, o null.
   */
  async getDelivererName(
    phone: string,
    businessId: string,
  ): Promise<string | null> {
    const deliverer = await this.prisma.deliverer.findUnique({
      where: {
        phone_businessId: { phone, businessId },
      },
      select: { name: true, active: true },
    });
    return deliverer?.active ? deliverer.name : null;
  }
}
