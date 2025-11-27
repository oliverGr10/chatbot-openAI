import type { Request, Response, NextFunction } from 'express';
import { GetProductsUseCase } from '../../../application/use-cases/GetProductsUseCase.js';
import { NotFoundError, BadRequestError } from '../../../utils/AppError.js';

export class ProductController {
    constructor(private getProductsUseCase: GetProductsUseCase) { }

    async getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const products = await this.getProductsUseCase.execute();

            res.status(200).json({
                success: true,
                data: products,
            });
        } catch (error) {
            next(error);
        }
    }

    async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id || '0');

            // Validar que el ID sea válido
            if (isNaN(id) || id <= 0) {
                throw new BadRequestError('ID de producto inválido');
            }

            const product = await this.getProductsUseCase.executeById(id);

            // Si no existe el producto, lanzar error 404
            if (!product) {
                throw new NotFoundError(`Producto con ID ${id} no encontrado`);
            }

            res.status(200).json({
                success: true,
                data: product,
            });
        } catch (error) {
            next(error);
        }
    }
}
