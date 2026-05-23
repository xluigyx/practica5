/**
 * Seed inicial: crea un negocio demo y usuario admin.
 * Ejecutar: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Negocio demo
  const business = await prisma.business.upsert({
    where: { whatsappNumber: '+59162658425' },
    update: {},
    create: {
      name: 'Salteñería La Paz',
      whatsappNumber: '+59162658425',
      whatsappNumberDelivery: '+59179999999',
      plan: 'STARTER',
      configJson: {
        welcomeMessage:
          '¡Hola! Soy Luz, tu asistente de ventas de Salteñería La Paz. ¿Qué se te antoja hoy? 😊',
        schedule: 'Lunes a sábado de 7:00 a 19:00',
      },
    },
  });

  console.log('Negocio creado:', business.name);

  // Usuario admin
  const passwordHash = await bcrypt.hash('admin1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@salteneria.bo' },
    update: {},
    create: {
      businessId: business.id,
      email: 'admin@salteneria.bo',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Usuario admin creado:', user.email);

  // Productos demo
  const products = [
    {
      name: 'Salteña de pollo',
      description: 'Jugosa salteña de pollo con caldo, papas y aceitunas',
      priceBs: 8.0,
      stock: 100,
      category: 'Salteñas',
    },
    {
      name: 'Salteña de carne',
      description: 'Salteña de res con caldo, huevo duro y pasas',
      priceBs: 9.0,
      stock: 80,
      category: 'Salteñas',
    },
    {
      name: 'Salteña de queso',
      description: 'Salteña veggie rellena de queso y verduras',
      priceBs: 7.5,
      stock: 50,
      category: 'Salteñas',
    },
    {
      name: 'Tucumana frita',
      description: 'Crujiente tucumana frita con relleno de carne y verduras',
      priceBs: 6.0,
      stock: 60,
      category: 'Tucumanas',
    },
    {
      name: 'Api morado',
      description: 'Bebida caliente tradicional de maíz morado con canela',
      priceBs: 5.0,
      stock: 200,
      category: 'Bebidas',
    },
    {
      name: 'Refresco de mocochinchi',
      description: 'Bebida fría de durazno deshidratado',
      priceBs: 4.0,
      stock: 150,
      category: 'Bebidas',
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: `seed-${p.name.replace(/\s/g, '-').toLowerCase()}` },
      update: {},
      create: {
        ...p,
        businessId: business.id,
        available: true,
        id: `seed-${p.name.replace(/\s/g, '-').toLowerCase()}`,
      },
    });
  }

  console.log(`${products.length} productos creados`);

  // Repartidor demo
  await prisma.deliverer.upsert({
    where: {
      phone_businessId: { phone: '+59179999999', businessId: business.id },
    },
    update: {},
    create: {
      businessId: business.id,
      phone: '+59179999999',
      name: 'Carlos Repartidor',
      active: true,
    },
  });

  console.log('Repartidor demo creado');
  console.log('\n✅ Seed completado exitosamente!');
  console.log('📧 Login: admin@salteneria.bo');
  console.log('🔑 Password: admin1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
