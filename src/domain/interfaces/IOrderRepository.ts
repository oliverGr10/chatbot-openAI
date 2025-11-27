import type { Order, CreateOrderDTO } from '../entities/Order.js';

export interface IOrderRepository {
    create(orderData: CreateOrderDTO): Promise<Order>;
    findById(id: number): Promise<Order | null>;
}
