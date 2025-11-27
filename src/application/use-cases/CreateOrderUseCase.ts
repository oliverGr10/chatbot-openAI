import type { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import type { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import type { CreateOrderDTO, Order } from '../../domain/entities/Order.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/AppError.js';

export class CreateOrderUseCase {
    constructor(
        private orderRepo: IOrderRepository,
        private productRepo: IProductRepository
    ) { }

    async execute(orderData: CreateOrderDTO): Promise<Order> {
        // Validar que hay items en el pedido
        if (!orderData.items || orderData.items.length === 0) {
            throw new ValidationError('El pedido debe contener al menos un producto');
        }

        // Validar productos existen y tienen stock suficiente
        for (const item of orderData.items) {
            const product = await this.productRepo.findById(item.productId);

            if (!product) {
                throw new NotFoundError(`Producto con ID ${item.productId} no encontrado`);
            }

            if (product.stock < item.quantity) {
                throw new ConflictError(
                    `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`
                );
            }

            if (item.quantity <= 0) {
                throw new ValidationError('La cantidad debe ser mayor a 0');
            }
        }

        // Crear el pedido (el repositorio maneja la actualización de stock)
        const order = await this.orderRepo.create(orderData);

        return order;
    }
}
