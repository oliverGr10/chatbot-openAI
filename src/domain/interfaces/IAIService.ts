import type { ChatContext } from '../entities/Message.js';
import type { IProductRepository } from './IProductRepository.js';
import type { IOrderRepository } from './IOrderRepository.js';

export interface IAIService {
    generateResponse(context: ChatContext, userMessage: string): Promise<string>;
    setRepositories?(productRepo: IProductRepository, orderRepo: IOrderRepository): void;
}
