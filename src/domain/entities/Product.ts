export interface Product{
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    createdAt: Date;
}
export interface ProductWithQuantity extends Product{
    quantity: number;
}