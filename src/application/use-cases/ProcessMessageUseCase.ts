import type { IAIService } from '../../domain/interfaces/IAIService.js';
import type { IConversationRepository } from '../../domain/interfaces/IConversationRepository.js';

export class ProcessMessageUseCase {
    constructor(
        private aiService: IAIService,
        private conversationRepo: IConversationRepository
    ) { }

    async execute(userPhone: string, userMessage: string): Promise<string> {

        const context = await this.conversationRepo.getContext(userPhone);

        await this.conversationRepo.saveMessage(userPhone, userMessage, 'user');

        const aiResponse = await this.aiService.generateResponse(context, userMessage);

        await this.conversationRepo.saveMessage(userPhone, aiResponse, 'assistant');

        return aiResponse;
    }
}
