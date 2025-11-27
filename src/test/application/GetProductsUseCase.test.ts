import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { GetProductsUseCase } from '../../application/use-cases/GetProductsUseCase.js';
import type { IProductRepository } from '../../domain/interfaces/IProductRepository.js';
import type { Product } from '../../domain/entities/Product.js';

describe('GetProductsUseCase - Consulta de Productos', () => {
  let getProductsUseCase: GetProductsUseCase;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockProductRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      updateStock: jest.fn(),
    } as any;

    getProductsUseCase = new GetProductsUseCase(mockProductRepo);
  });

  test('debe obtener todos los productos', async () => {
    // Arrange
    const mockProducts: Product[] = [
      {
        id: 1,
        name: 'Cemento',
        description: 'Cemento Portland',
        price: 28.5,
        stock: 10,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'Fierro',
        description: 'Fierro corrugado',
        price: 32.0,
        stock: 5,
        createdAt: new Date(),
      },
    ];

    mockProductRepo.findAll.mockResolvedValue(mockProducts);

    // Act
    const result = await getProductsUseCase.execute();

    // Assert
    expect(result).toEqual(mockProducts);
    expect(mockProductRepo.findAll).toHaveBeenCalledTimes(1);
  });

  test('debe obtener producto por ID', async () => {
    // Arrange
    const mockProduct: Product = {
      id: 1,
      name: 'Cemento Portland',
      description: 'Cemento de alta resistencia',
      price: 28.5,
      stock: 10,
      createdAt: new Date(),
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct);

    // Act
    const result = await getProductsUseCase.executeById(1);

    // Assert
    expect(result).toEqual(mockProduct);
    expect(mockProductRepo.findById).toHaveBeenCalledWith(1);
  });

  test('debe retornar null si el producto no existe', async () => {
    // Arrange
    mockProductRepo.findById.mockResolvedValue(null);

    // Act
    const result = await getProductsUseCase.executeById(999);

    // Assert
    expect(result).toBeNull();
    expect(mockProductRepo.findById).toHaveBeenCalledWith(999);
  });

  test('debe buscar productos por nombre', async () => {
    // Arrange
    const mockProducts: Product[] = [
      {
        id: 4,
        name: 'Pintura Látex Blanca',
        description: 'Pintura de acabado mate',
        price: 45.0,
        stock: 5,
        createdAt: new Date(),
      },
    ];

    mockProductRepo.findByName.mockResolvedValue(mockProducts);

    // Act
    const result = await getProductsUseCase.executeByName('pintura');

    // Assert
    expect(result).toEqual(mockProducts);
    expect(mockProductRepo.findByName).toHaveBeenCalledWith('pintura');
  });

  test('debe retornar array vacío si no encuentra productos por nombre', async () => {
    // Arrange
    mockProductRepo.findByName.mockResolvedValue([]);

    // Act
    const result = await getProductsUseCase.executeByName('inexistente');

    // Assert
    expect(result).toEqual([]);
    expect(mockProductRepo.findByName).toHaveBeenCalledWith('inexistente');
  });
});
