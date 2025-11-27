import type { Request, Response, NextFunction } from 'express';
import { CreateOrderUseCase } from '../../../application/use-cases/CreateOrderUseCase.js';
import { BadRequestError } from '../../../utils/AppError.js';

export class OrderController {
    constructor(private createOrderUseCase: CreateOrderUseCase) { }

    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { customerName, customerPhone, customerAddress, items } = req.body;

            // Validación de campos requeridos
            if (!customerName || !customerPhone || !customerAddress || !items) {
                throw new BadRequestError(
                    'customerName, customerPhone, customerAddress e items son requeridos'
                );
            }

            // Ejecutar caso de uso
            const order = await this.createOrderUseCase.execute({
                customerName,
                customerPhone,
                customerAddress,
                items,
            });

            // Respuesta exitosa
            res.status(201).json({
                success: true,
                data: order,
                message: 'Pedido creado exitosamente',
            });
        } catch (error) {
            // Delegar al middleware de manejo de errores
            next(error);
        }
    }
}
