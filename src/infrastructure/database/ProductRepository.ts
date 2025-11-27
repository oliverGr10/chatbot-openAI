// src/infrastructure/database/ProductRepository.ts
import type { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';
import { prisma } from './prisma-client.js';

export class ProductRepository implements IProductRepository {
    async findAll(): Promise<Product[]> {
        return await prisma.product.findMany();
    }

    async findById(id: number): Promise<Product | null> {
        return await prisma.product.findUnique({
            where: { id },
        });
    }

    async findByName(name: string): Promise<Product[]> {
        return await prisma.product.findMany({
            where: {
                name: {
                    contains: name,
                },
            },
        });
    }

    async updateStock(productId: number, newStock: number): Promise<void> {
        await prisma.product.update({
            where: { id: productId },
            data: { stock: newStock },
        });
    }
}
