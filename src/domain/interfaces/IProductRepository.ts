import type { Product } from '../entities/Product.js';

export interface IProductRepository {
    findAll(): Promise<Product[]>;
    findById(id: number): Promise<Product | null>;
    findByName(name: string): Promise<Product[]>;
    updateStock(productId: number, newStock: number): Promise<void>;
}
