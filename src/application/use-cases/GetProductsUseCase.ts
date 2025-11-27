import type { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';

export class GetProductsUseCase {
    constructor(private productRepo: IProductRepository) { }

    async execute(): Promise<Product[]> {
        return await this.productRepo.findAll();
    }

    async executeById(id: number): Promise<Product | null> {
        return await this.productRepo.findById(id);
    }

    async executeByName(name: string): Promise<Product[]> {
        return await this.productRepo.findByName(name);
    }
}
