import type { IConversationRepository } from '../../domain/interfaces/IConversationRepository.js';
import type { Message, ChatContext } from '../../domain/entities/Message.js';
import { prisma } from './prisma-client.js';

export class ConversationRepository implements IConversationRepository {
    async saveMessage(
        userPhone: string,
        message: string,
        role: 'user' | 'assistant'
    ): Promise<void> {
        await prisma.conversation.create({
            data: {
                userPhone,
                message,
                role,
            },
        });
    }

    async getHistory(userPhone: string, limit: number = 10): Promise<Message[]> {
        const messages = await prisma.conversation.findMany({
            where: { userPhone },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return messages.reverse().map(msg => ({
    ...msg,
    role: msg.role as 'user' | 'assistant',
  }));
}

    async getContext(userPhone: string): Promise<ChatContext> {
        const history = await this.getHistory(userPhone, 10);
        return {
            userPhone,
            history,
        };
    }
}
