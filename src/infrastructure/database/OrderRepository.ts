import type { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import type { Order, CreateOrderDTO } from '../../domain/entities/Order.js';
import { prisma } from './prisma-client.js';
import { text } from 'stream/consumers';

export class OrderRepository implements IOrderRepository {
    async create(orderData: CreateOrderDTO): Promise<Order> {
  return await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const itemsWithPrice = [];

    for (const item of orderData.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      itemsWithPrice.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: product.stock - item.quantity },
      });
    }

    const order = await tx.order.create({
      data: {
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        totalAmount,
        items: {
          create: itemsWithPrice,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return {
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        ...item.product,
        quantity: item.quantity,
      })),
    };
  });
}

    async findById(id: number): Promise<Order | null> {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) return null;

        return {
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            items: order.items.map((item) => ({
                ...item.product,
                quantity: item.quantity,
            })),
        };
    }
}
