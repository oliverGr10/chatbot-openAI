import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase.js';
import type { IOrderRepository } from '../../domain/interfaces/IOrderRepository.js';
import type { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import type { CreateOrderDTO, Order } from '../../domain/entities/Order.js';
import type { Product } from '../../domain/entities/Product.js';

describe('CreateOrderUseCase - Lógica de Negocio Crítica', () => {
  let createOrderUseCase: CreateOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    // Crear mocks
    mockOrderRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPhone: jest.fn(),
    } as any;

    mockProductRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
      updateStock: jest.fn(),
    } as any;

    createOrderUseCase = new CreateOrderUseCase(mockOrderRepo, mockProductRepo);
  });

  test('debe crear pedido exitosamente cuando hay stock suficiente', async () => {
    // Arrange
    const orderData: CreateOrderDTO = {
      customerName: 'Juan Pérez',
      customerPhone: '987654321',
      customerAddress: 'Av. Lima 123',
      items: [{ productId: 1, quantity: 3 }],
    };

    const mockProduct: Product = {
      id: 1,
      name: 'Cemento Portland',
      description: 'Cemento de alta resistencia',
      price: 28.5,
      stock: 10, // Suficiente stock
      createdAt: new Date(),
    };

    const mockOrder: Order = {
      id: 1,
      ...orderData,
      totalAmount: 85.5,
      items: [{ ...mockProduct, quantity: 3 }],
      createdAt: new Date(),
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct);
    mockOrderRepo.create.mockResolvedValue(mockOrder);

    // Act
    const result = await createOrderUseCase.execute(orderData);

    // Assert
    expect(result).toEqual(mockOrder);
    expect(mockProductRepo.findById).toHaveBeenCalledWith(1);
    expect(mockOrderRepo.create).toHaveBeenCalledWith(orderData);
  });

  test('debe lanzar NotFoundError cuando el producto no existe', async () => {
    // Arrange
    const orderData: CreateOrderDTO = {
      customerName: 'Juan Pérez',
      customerPhone: '987654321',
      customerAddress: 'Av. Lima 123',
      items: [{ productId: 999, quantity: 1 }], // ID inexistente
    };

    mockProductRepo.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(createOrderUseCase.execute(orderData)).rejects.toMatchObject({
      message: 'Producto con ID 999 no encontrado',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(mockProductRepo.findById).toHaveBeenCalledWith(999);
    expect(mockOrderRepo.create).not.toHaveBeenCalled();
  });

  test('debe lanzar ConflictError cuando no hay stock suficiente', async () => {
    // Arrange
    const orderData: CreateOrderDTO = {
      customerName: 'Juan Pérez',
      customerPhone: '987654321',
      customerAddress: 'Av. Lima 123',
      items: [{ productId: 1, quantity: 20 }], // Pide más de lo disponible
    };

    const mockProduct: Product = {
      id: 1,
      name: 'Cemento Portland',
      description: 'Cemento de alta resistencia',
      price: 28.5,
      stock: 10, // Solo hay 10
      createdAt: new Date(),
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct);

    // Act & Assert
    await expect(createOrderUseCase.execute(orderData)).rejects.toMatchObject({
      message: 'Stock insuficiente para Cemento Portland. Disponible: 10, Solicitado: 20',
      statusCode: 409,
      code: 'CONFLICT',
    });
    expect(mockProductRepo.findById).toHaveBeenCalledWith(1);
    expect(mockOrderRepo.create).not.toHaveBeenCalled();
  });

  test('debe validar todos los productos en un pedido con múltiples items', async () => {
    // Arrange
    const orderData: CreateOrderDTO = {
      customerName: 'María López',
      customerPhone: '912345678',
      customerAddress: 'Calle Los Pinos 456',
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 5 },
      ],
    };

    const mockProduct1: Product = {
      id: 1,
      name: 'Cemento',
      description: 'Cemento',
      price: 28.5,
      stock: 10,
      createdAt: new Date(),
    };

    const mockProduct2: Product = {
      id: 2,
      name: 'Fierro',
      description: 'Fierro corrugado',
      price: 32.0,
      stock: 8,
      createdAt: new Date(),
    };

    const mockOrder: Order = {
      id: 2,
      ...orderData,
      totalAmount: 217.0,
      items: [
        { ...mockProduct1, quantity: 2 },
        { ...mockProduct2, quantity: 5 },
      ],
      createdAt: new Date(),
    };

    mockProductRepo.findById.mockImplementation(async (id: number) => {
      if (id === 1) return mockProduct1;
      if (id === 2) return mockProduct2;
      return null;
    });

    mockOrderRepo.create.mockResolvedValue(mockOrder);

    // Act
    const result = await createOrderUseCase.execute(orderData);

    // Assert
    expect(mockProductRepo.findById).toHaveBeenCalledTimes(2);
    expect(mockProductRepo.findById).toHaveBeenCalledWith(1);
    expect(mockProductRepo.findById).toHaveBeenCalledWith(2);
    expect(result).toEqual(mockOrder);
  });

  test('debe fallar si el segundo producto no tiene stock suficiente', async () => {
    // Arrange
    const orderData: CreateOrderDTO = {
      customerName: 'Carlos Ruiz',
      customerPhone: '923456789',
      customerAddress: 'Jr. Amazonas 789',
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 15 }, // Más de lo disponible
      ],
    };

    const mockProduct1: Product = {
      id: 1,
      name: 'Cemento',
      description: 'Cemento',
      price: 28.5,
      stock: 10,
      createdAt: new Date(),
    };

    const mockProduct2: Product = {
      id: 2,
      name: 'Fierro',
      description: 'Fierro corrugado',
      price: 32.0,
      stock: 8, // Solo hay 8
      createdAt: new Date(),
    };

    mockProductRepo.findById.mockImplementation(async (id: number) => {
      if (id === 1) return mockProduct1;
      if (id === 2) return mockProduct2;
      return null;
    });

    // Act & Assert
    await expect(createOrderUseCase.execute(orderData)).rejects.toThrow(
      'Stock insuficiente para Fierro'
    );
  });
});
