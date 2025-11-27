import type { ProductWithQuantity } from "./Product.js";
export interface Order {
    id: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    totalAmount: number;
    items: ProductWithQuantity[];
    createdAt: Date;
}

export interface CreateOrderDTO {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: Array<{
        productId: number;
        quantity: number;
    }>;
}
