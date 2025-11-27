import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const products = [
    {
      name: 'Cemento Portland Tipo I (Bolsa 42.5 kg)',
      description: 'Cemento de alta resistencia ideal para estructuras, muros y pisos.',
      price: 28.50,
      stock: 10,
    },
    {
      name: 'Fierro Corrugado 1/2" x 9 m',
      description: 'Varilla de acero corrugado para refuerzo de concreto en obras de construcción.',
      price: 32.00,
      stock: 10,
    },
    {
      name: 'Clavo de acero 2" (caja x 1 kg)',
      description: 'Clavos galvanizados para carpintería y estructuras livianas.',
      price: 9.90,
      stock: 10,
    },
    {
      name: 'Pintura Látex Blanca 1 galón',
      description: 'Pintura de acabado mate para interiores, de fácil aplicación y secado rápido.',
      price: 45.00,
      stock: 5,
    },
    {
      name: 'Brocha de 2" de cerda sintética',
      description: 'Brocha económica y duradera, ideal para pintura en muros y superficies lisas.',
      price: 8.50,
      stock: 5,
    },
    {
      name: 'Taladro Percutor 1/2" 710W (marca Truper)',
      description: 'Taladro eléctrico de doble función (perforar y percutir) con mango auxiliar.',
      price: 189.00,
      stock: 3,
    },
    {
      name: 'Cinta Métrica de 5 metros',
      description: 'Cinta de acero retráctil con gancho imantado y carcasa ergonómica.',
      price: 17.00,
      stock: 8,
    },
    {
      name: 'Llave Stillson 14" (ajustable)',
      description: 'Llave ajustable para tuberías metálicas, de cuerpo robusto y dientes templados.',
      price: 46.00,
      stock: 1,
    },
    {
      name: 'Guantes de Seguridad de Nitrilo (par)',
      description: 'Guantes resistentes a cortes y productos químicos, ideales para trabajos industriales.',
      price: 11.50,
      stock: 1,
    },
    {
      name: 'Foco LED 12W rosca E27 (luz fría)',
      description: 'Foco LED de bajo consumo y larga duración, equivalente a 100W incandescente.',
      price: 7.90,
      stock: 4,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
